from app.db import NeonDB
from app.models.user import User

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
    async def create_user(username: str, email: str) -> int:
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            user_id = await conn.fetchval(
                '''
                INSERT INTO users (username, email, created_at)
                VALUES ($1, $2, NOW())
                RETURNING id
                ''',
                username, email
            )
            return user_id

    @staticmethod
    async def get_all_users():
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch('SELECT * FROM users ORDER BY created_at DESC')
            return [User.from_db(row) for row in rows]