from app.db import NeonDB
from app.models.user import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    async def get_user_by_id(user_id: int) -> User:
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT * FROM users WHERE id = $1',
                user_id
            )
            return User.from_db(row)
        

    @staticmethod
    async def create_user(username: str, email: str, clerk_id: str, image_url: str) -> int:
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            user_id = await conn.fetchval(
                '''
                INSERT INTO users (username, email, clerk_id, created_at, image_url)
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING id
                ''',
                username, email, clerk_id, image_url
            )
            print(user_id)
            return user_id

    @staticmethod
    async def get_all_users():
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch('SELECT * FROM users')
            logger.info(f"Fetched rows: {rows}")
            return [User.from_db(row) for row in rows]