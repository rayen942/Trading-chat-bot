"""Application configuration, loaded from environment variables."""

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/moneytrade",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-insecure-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    # Anthropic key is read by the SDK directly from ANTHROPIC_API_KEY.
