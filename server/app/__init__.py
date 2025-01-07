from quart import Quart
from config import Config
from app.db import NeonDB

def create_app():
    app = Quart(__name__)
    app.config.from_object(Config)
    
    @app.before_serving
    async def startup():
        await NeonDB.get_pool()

    @app.after_serving
    async def shutdown():
        await NeonDB.close_pool()

    from app.routes.api import api_bp

    app.register_blueprint(api_bp)

    return app