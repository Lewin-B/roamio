from app.db import NeonDB
from typing import List, Dict, Any, Optional
import asyncio
from app.utils.elo import DynamicEloSystem

class RatingService:
    def __init__(self):
        self.elo_system = DynamicEloSystem()

    async def get_place_last_elo_rating(self, place_id: int) -> float:
        """Get the last ELO rating for a place from reviews"""
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            result = await conn.fetchval(
                '''
                SELECT elo_rating 
                FROM reviews 
                WHERE place_id = $1 
                ORDER BY id DESC 
                LIMIT 1
                ''',
                place_id
            )
            return float(result) if result else 1000.0

    async def update_place_avg_rating(self, place_id: int) -> None:
        """Calculate and update average rating for a place"""
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            # Calculate average rating from all reviews
            avg_rating = await conn.fetchval(
                '''
                SELECT AVG(rating)
                FROM reviews
                WHERE place_id = $1
                ''',
                place_id
            )
            
            # Update places table with new average
            if avg_rating is not None:
                await conn.execute(
                    '''
                    UPDATE places 
                    SET avg_rating = $1 
                    WHERE id = $2
                    ''',
                    float(avg_rating), place_id
                )

    async def create_or_update_review(
        self, 
        user_id: int, 
        place_id: int, 
        elo_rating: float,
        text_review: str = None,
        username: str = None,
        review_id: int = None
    ) -> None:
        """Create or update a review entry"""
        normalized_rating = self.elo_system.normalize_rating(
            elo_rating, 
            min_rating=0, 
            max_rating=2000,
            scale=10
        )
        
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            # Get place name
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
            
            if review_id:
                # Update existing review
                await conn.execute("""
                    UPDATE reviews 
                    SET text_review = COALESCE($1, text_review),
                        rating = $2,
                        elo_rating = $3,
                        username = $4
                    WHERE id = $5
                """, text_review, normalized_rating, elo_rating, username, review_id)
            else:
                # Create new review
                await conn.execute("""
                    INSERT INTO reviews 
                    (text_review, user_id, place_id, place_name, rating, elo_rating, username)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                """, text_review, user_id, place_id, place_name, normalized_rating, 
                    elo_rating, username)

        async def update_rankings(self) -> None:
            """Update rankings based on average ratings"""
            pool = await NeonDB.get_pool()
            async with pool.acquire() as conn:
                await conn.execute("""
                    WITH ranked AS (
                        SELECT 
                            id,
                            ROW_NUMBER() OVER (ORDER BY avg_rating DESC) as new_rank
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
        username = data.get('username')
        
        updated_ratings = {}
        affected_places = set()
        
        # First pass: collect current ratings
        for match in matches:
            winner_id = match.get('winner')
            loser_id = match.get('loser')
            tie_ids = match.get('tie', [])
            
            for pid in filter(None, [winner_id, loser_id] + tie_ids):
                if pid not in updated_ratings:
                    updated_ratings[pid] = await self.get_place_last_elo_rating(pid)
                affected_places.add(pid)

        # Second pass: process matches
        for match in matches:
            winner_id = match.get('winner')
            loser_id = match.get('loser')
            tie_ids = match.get('tie', [])

            # Special case: Handle single place rating
            if len([x for x in [winner_id, loser_id] + tie_ids if x is not None]) == 1:
                single_id = next(pid for pid in [winner_id, loser_id] if pid is not None)
                current_rating = updated_ratings[single_id]
                
                if winner_id:
                    vote_type = 'up'
                elif loser_id:
                    vote_type = 'down'
                else:
                    vote_type = 'neutral'
                
                new_rating = self.elo_system.update_single_rating(
                    current_rating,
                    vote_type,
                    len(matches)
                )
                updated_ratings[single_id] = new_rating
                continue

            # Normal case: Process comparative ratings
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
                winner_rating = updated_ratings[winner_id]
                loser_rating = updated_ratings[loser_id]
                new_winner, new_loser = self.elo_system.compare(
                    winner_rating, loser_rating, 1, len(matches)
                )
                updated_ratings[winner_id] = new_winner
                updated_ratings[loser_id] = new_loser

        # In process_matches method, replace the create_review call with:
        if user_id and place_id:
            await self.create_or_update_review(
                user_id=user_id,
                place_id=place_id,
                text_review=text_review,  # Can be None
                elo_rating=updated_ratings.get(place_id, 1000),
                username=username,
                review_id=data.get('review_id')  # Will be None for new reviews
            )
        else:
            # If no review but ratings changed, update affected places
            for pid in affected_places:
                await self.update_place_avg_rating(pid)
        
        # Update rankings
        await self.update_rankings()
        
        # Return current place information
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            places = await conn.fetch("""
                SELECT p.id, p.name, p.avg_rating, r.elo_rating, p.ranking
                FROM places p
                LEFT JOIN (
                    SELECT place_id, elo_rating
                    FROM reviews
                    WHERE (place_id, id) IN (
                        SELECT place_id, MAX(id)
                        FROM reviews
                        GROUP BY place_id
                    )
                ) r ON p.id = r.place_id
                WHERE p.id = ANY($1::int[])
            """, list(affected_places))
            
            return {place['id']: {
                'name': place['name'],
                'avg_rating': float(place['avg_rating']) if place['avg_rating'] else None,
                'elo_rating': float(place['elo_rating']) if place['elo_rating'] else 1000,
                'ranking': place['ranking']
            } for place in places}