import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

class NeonDB:
    _pool = None

    @classmethod
    async def get_pool(cls):
        if cls._pool is None:
            connection_string = os.getenv('DATABASE_URL')
            if not connection_string:
                raise ValueError("DATABASE_URL environment variable is not set")
            cls._pool = await asyncpg.create_pool(
                connection_string,
                min_size=1,
                max_size=10,
                timeout=30
            )
        return cls._pool

    @classmethod
    async def close_pool(cls):
        if cls._pool:
            await cls._pool.close()
            cls._pool = None