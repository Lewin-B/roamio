import os
import asyncio
import asyncpg
from dotenv import load_dotenv

async def connect_to_neon_db():
    load_dotenv()

    connection_string = os.getenv('DATABASE_URL')

    # create pool
    pool = await asyncpg.create_pool(connection_string)

    # acquire a connection from the pool
    async with pool.acquire() as conn:
        time = await conn.fetchval('SELECT NOW();')
        version = await conn.fetchval('SELECT version();')

    # close the pool
    await pool.close()

    print('Current time:', time)
    print('PostgreSQL version:', version)

async def main():
    await connect_to_neon_db()
    

asyncio.run(main())