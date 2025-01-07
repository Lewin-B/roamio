from app import create_app
import asyncio
import hypercorn.asyncio

app = create_app()

async def main():
    config = hypercorn.Config()
    config.bind = ["0.0.0.0:5001"]
    await hypercorn.asyncio.serve(app, config)

if __name__ == '__main__':
    asyncio.run(main())