import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    SECRET_KEY = 'classpet_secret_key'
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(BASE_DIR, "classpet.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = True