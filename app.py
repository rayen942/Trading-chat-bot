"""
MoneyTrade AI - Python Flask Backend

App factory: wires SQLAlchemy + JWT, registers the auth/chat/trading
blueprints, and serves the static frontend so the whole app runs on one origin.
"""

import os

import click
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from sqlalchemy import text

from config import Config
from extensions import db, jwt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def create_app(config_class=Config) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)

    CORS(app)  # allow the frontend (and external clients) to call the API
    db.init_app(app)
    jwt.init_app(app)

    # Models must be imported so SQLAlchemy/`create_all` knows about them.
    from models import (  # noqa: F401
        User, Position, Trade, Conversation, Message, WatchlistItem, Achievement,
    )

    from blueprints.auth import auth_bp
    from blueprints.chat import chat_bp
    from blueprints.trading import trading_bp
    from blueprints.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(trading_bp)
    app.register_blueprint(admin_bp)

    # ── Health check ──────────────────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "MoneyTrade AI Backend"})

    # ── Serve the frontend ────────────────────────────────────
    @app.route("/", methods=["GET"])
    def index():
        return send_from_directory(BASE_DIR, "index.html")

    @app.route("/<path:filename>", methods=["GET"])
    def static_files(filename):
        # Only serve known frontend assets from the project root.
        if filename in ("script.js", "styles.css") or filename.endswith(
            (".css", ".js", ".png", ".jpg", ".svg", ".ico")
        ):
            return send_from_directory(BASE_DIR, filename)
        # Unknown path → fall back to the SPA entry point.
        return send_from_directory(BASE_DIR, "index.html")

    # ── CLI: `flask --app app init-db` ────────────────────────
    @app.cli.command("init-db")
    def init_db():
        """Create all database tables."""
        db.create_all()
        print("Database tables created.")

    # ── CLI: `flask --app app make-admin user@email.com` ──────
    @app.cli.command("make-admin")
    @click.argument("email")
    def make_admin(email):
        """Grant admin rights to an existing account by email."""
        from models import User

        db.create_all()      # ensure tables exist (fresh DBs)
        _run_migrations()    # ensure is_admin column exists (pre-existing DBs)
        user = User.query.filter_by(email=email.strip().lower()).first()
        if not user:
            print(f"No account found for {email!r}.")
            return
        user.is_admin = True
        db.session.commit()
        print(f"{user.email} is now an admin.")

    return app


def _run_migrations() -> None:
    """Idempotent, additive column migrations for existing databases.

    `db.create_all()` never ALTERs an already-created table, so new columns
    added to models must be backfilled here for installs that predate them.
    """
    db.session.execute(
        text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE"
        )
    )
    db.session.commit()


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    with app.app_context():
        db.create_all()  # convenience for local dev: ensure tables exist
        _run_migrations()  # backfill additive columns on pre-existing tables
    print(f"MoneyTrade AI backend running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
