import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. On récupère l'URL de Render via une variable d'environnement
# Si elle n'existe pas (sur ton PC), on utilise SQLite par défaut
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if SQLALCHEMY_DATABASE_URL:
    # Correction spécifique pour Render/Heroku qui utilisent 'postgres://'
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
            "postgres://", "postgresql://", 1)

    # Configuration pour PostgreSQL
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    # Configuration pour ton SQLite local
    SQLALCHEMY_DATABASE_URL = "sqlite:///./mortgage_app.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
