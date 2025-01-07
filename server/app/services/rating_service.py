from app.db import NeonDB
from typing import List, Dict, Any, Optional
import asyncio
from app.utils.elo import DynamicEloSystem

class RatingService:
    def __init__(self):
        self.elo_system = DynamicEloSystem()

    async def get_place_elo_rating(self, place_id: int) -> float:
        """Get current ELO rating for a place by ID"""
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            result = await conn.fetchval(
                'SELECT elo_rating FROM places WHERE id = $1',
                place_id
            )
            return float(result) if result else 1000.0

    async def update_place(self, place_id: int, elo_rating: float) -> None:
        """Update place with new ratings"""
        normalized_rating = self.elo_system.normalize_rating(
            elo_rating, 
            min_rating=0, 
            max_rating=2000,
            scale=10
        )
        
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                '''
                UPDATE places 
                SET rating = $1, elo_rating = $2 
                WHERE id = $3
                ''',
                normalized_rating, elo_rating, place_id
            )

    async def create_review(
        self, 
        user_id: int, 
        place_id: int, 
        text_review: str,
        elo_rating: float,
        username: str = None  # Added username parameter
    ) -> None:
        """Create a review entry"""
        normalized_rating = self.elo_system.normalize_rating(
            elo_rating, 
            min_rating=0, 
            max_rating=2000,
            scale=10
        )
        
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            # Get place name for the review
            place_name = await conn.fetchval(
                'SELECT name FROM places WHERE id = $1',
                place_id
            )
            
            # If username not provided, get it from users table
            if not username:
                username = await conn.fetchval(
                    'SELECT username FROM users WHERE id = $1',
                    user_id
                )
            
            # Create review with all required fields
            await conn.execute(
                '''
                INSERT INTO reviews 
                (text_review, user_id, place_id, place_name, rating, elo_rating, username)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ''',
                text_review, user_id, place_id, place_name, normalized_rating, elo_rating, username
            )

    async def update_rankings(self) -> None:
        """Update rankings based on ELO ratings"""
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            await conn.execute("""
                WITH ranked AS (
                    SELECT 
                        id,
                        ROW_NUMBER() OVER (ORDER BY elo_rating DESC) as new_rank
                    FROM places
                )
                UPDATE places
                SET ranking = ranked.new_rank::text
                FROM ranked
                WHERE places.id = ranked.id
            """)

    async def process_matches(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Process matches and create review"""
        matches = data.get('matches', [])
        user_id = data.get('user_id')
        place_id = data.get('place_id')
        text_review = data.get('text_review')
        username = data.get('username')  # Optional username from request
        
        updated_ratings = {}
        
        # First pass: collect current ratings
        for match in matches:
            winner_id = match.get('winner')
            loser_id = match.get('loser')
            tie_ids = match.get('tie', [])
            
            for pid in filter(None, [winner_id, loser_id] + tie_ids):
                if pid not in updated_ratings:
                    updated_ratings[pid] = await self.get_place_elo_rating(pid)

        # Second pass: process matches
        for match in matches:
            winner_id = match.get('winner')
            loser_id = match.get('loser')
            tie_ids = match.get('tie', [])
            
            if tie_ids:
                # Handle ties
                for i in range(len(tie_ids)):
                    for j in range(i + 1, len(tie_ids)):
                        rating_a = updated_ratings[tie_ids[i]]
                        rating_b = updated_ratings[tie_ids[j]]
                        new_a, new_b = self.elo_system.compare(
                            rating_a, rating_b, 0.5, len(matches)
                        )
                        updated_ratings[tie_ids[i]] = new_a
                        updated_ratings[tie_ids[j]] = new_b
            
            elif winner_id and loser_id:
                # Handle winner/loser
                winner_rating = updated_ratings[winner_id]
                loser_rating = updated_ratings[loser_id]
                new_winner, new_loser = self.elo_system.compare(
                    winner_rating, loser_rating, 1, len(matches)
                )
                updated_ratings[winner_id] = new_winner
                updated_ratings[loser_id] = new_loser
            
            elif winner_id and not loser_id:
                # Handle single thumbs up against baseline
                current_rating = updated_ratings[winner_id]
                baseline_rating = 1000
                new_rating, _ = self.elo_system.compare(
                    current_rating, baseline_rating, 1, len(matches)
                )
                updated_ratings[winner_id] = new_rating

        # Update all places with new ratings
        update_tasks = [
            self.update_place(pid, rating)
            for pid, rating in updated_ratings.items()
        ]
        await asyncio.gather(*update_tasks)
        
        # Create review if this is user's review
        if user_id and place_id and text_review:
            await self.create_review(
                user_id=user_id,
                place_id=place_id,
                text_review=text_review,
                elo_rating=updated_ratings.get(place_id, 1000),
                username=username
            )
        
        # Update rankings
        await self.update_rankings()
        
        return updated_ratings