import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    # Database
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    # Application
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-change-this')
    QUART_DEBUG = True
    QUART_AUTO_OPTIONS = True
    
    # Server
    PORT = int(os.getenv('PORT', 5001))
    HOST = os.getenv('HOST', '0.0.0.0')