from app.db import NeonDB
from typing import List, Dict, Any
import asyncio

from app.utils.elo import DynamicEloSystem

class RatingService:
    def __init__(self):
        self.elo_system = DynamicEloSystem()

    async def get_place_rating(self, place_name: str) -> float:
        """Get current rating for a place"""
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            result = await conn.fetchval(
                'SELECT rating FROM places WHERE name = $1',
                place_name
            )
            return float(result) if result else 1000.0

    async def update_place_rating(self, place_name: str, new_rating: float) -> None:
        """Update rating for a place"""
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                'UPDATE places SET rating = $1 WHERE name = $2',
                new_rating, place_name
            )

    async def update_rankings(self) -> None:
        """Update rankings based on current ratings"""
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            # Update rankings based on rating order
            await conn.execute("""
                WITH ranked AS (
                    SELECT 
                        id,
                        ROW_NUMBER() OVER (ORDER BY rating DESC) as new_rank
                    FROM places
                )
                UPDATE places
                SET ranking = ranked.new_rank::text
                FROM ranked
                WHERE places.id = ranked.id
            """)

    async def process_matches(self, matches: List[Dict[str, Any]]) -> Dict[str, float]:
        """Process a series of 1v1 matches and update ratings"""
        updated_ratings = {}
        
        # First pass: collect current ratings
        for match in matches:
            winner_name = match['winner']
            loser_name = match['loser']
            
            if winner_name and winner_name not in updated_ratings:
                updated_ratings[winner_name] = await self.get_place_rating(winner_name)
            if loser_name and loser_name not in updated_ratings:
                updated_ratings[loser_name] = await self.get_place_rating(loser_name)

        # Second pass: process matches
        for match in matches:
            winner_name = match['winner']
            loser_name = match['loser']
            
            if not winner_name or not loser_name:
                continue

            winner_rating = updated_ratings[winner_name]
            loser_rating = updated_ratings[loser_name]
            
            # Process the match with outcome 1 for winner
            new_winner_rating, new_loser_rating = self.elo_system.compare(
                winner_rating,
                loser_rating,
                1,  # Winner gets outcome 1
                len(matches)
            )
            
            updated_ratings[winner_name] = new_winner_rating
            updated_ratings[loser_name] = new_loser_rating

        # Update database with new ratings
        update_tasks = [
            self.update_place_rating(place_name, rating)
            for place_name, rating in updated_ratings.items()
        ]
        await asyncio.gather(*update_tasks)
        
        # Update rankings after all ratings are updated
        await self.update_rankings()
        
        return updated_ratings