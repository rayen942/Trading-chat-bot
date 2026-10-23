"""SQLAlchemy models for MoneyTrade AI.

Each model exposes a `to_dict()` that returns camelCase keys matching the
shapes the frontend (script.js) already uses, so rendering code stays simple.
"""

from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    avatar = db.Column(db.String(4), nullable=False)
    company = db.Column(db.String(120))
    password_hash = db.Column(db.String(255), nullable=False)

    balance = db.Column(db.Float, nullable=False, default=10000.0)
    xp = db.Column(db.Integer, nullable=False, default=0)
    theme = db.Column(db.String(40), nullable=False, default="default")
    dark_mode = db.Column(db.Boolean, nullable=False, default=True)
    sound_enabled = db.Column(db.Boolean, nullable=False, default=True)
    is_admin = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    positions = db.relationship(
        "Position", backref="user", cascade="all, delete-orphan", lazy=True
    )
    trades = db.relationship(
        "Trade", backref="user", cascade="all, delete-orphan", lazy=True
    )
    conversations = db.relationship(
        "Conversation", backref="user", cascade="all, delete-orphan", lazy=True
    )
    watchlist = db.relationship(
        "WatchlistItem", backref="user", cascade="all, delete-orphan", lazy=True
    )
    achievements = db.relationship(
        "Achievement", backref="user", cascade="all, delete-orphan", lazy=True
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "avatar": self.avatar,
            "company": self.company,
            "balance": self.balance,
            "xp": self.xp,
            "theme": self.theme,
            "darkMode": self.dark_mode,
            "soundEnabled": self.sound_enabled,
            "isAdmin": self.is_admin,
        }


class Position(db.Model):
    __tablename__ = "positions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    symbol = db.Column(db.String(20), nullable=False)
    type = db.Column(db.String(10), nullable=False, default="buy")
    quantity = db.Column(db.Float, nullable=False)
    price = db.Column(db.Float, nullable=False)
    cost = db.Column(db.Float, nullable=False)
    current_value = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "symbol": self.symbol,
            "type": self.type,
            "quantity": self.quantity,
            "price": self.price,
            "cost": self.cost,
            "currentValue": self.current_value,
            "time": self.created_at.isoformat(),
        }


class Trade(db.Model):
    __tablename__ = "trades"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    symbol = db.Column(db.String(20), nullable=False)
    type = db.Column(db.String(10), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    price = db.Column(db.Float, nullable=False)
    cost = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "symbol": self.symbol,
            "type": self.type,
            "quantity": self.quantity,
            "price": self.price,
            "cost": self.cost,
            "currentValue": self.cost,
            "time": self.created_at.isoformat(),
        }


class Conversation(db.Model):
    __tablename__ = "conversations"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False, default="New chat")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    messages = db.relationship(
        "Message",
        backref="conversation",
        cascade="all, delete-orphan",
        lazy=True,
        order_by="Message.created_at",
    )

    def to_dict(self, include_messages: bool = False) -> dict:
        data = {
            "id": self.id,
            "title": self.title,
            "createdAt": self.created_at.isoformat(),
        }
        if include_messages:
            data["messages"] = [m.to_dict() for m in self.messages]
        return data


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(
        db.Integer, db.ForeignKey("conversations.id"), nullable=False, index=True
    )
    role = db.Column(db.String(20), nullable=False)  # "user" | "assistant"
    content = db.Column(db.Text, nullable=False)
    tokens_used = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "tokensUsed": self.tokens_used,
            "time": self.created_at.isoformat(),
        }


class WatchlistItem(db.Model):
    __tablename__ = "watchlist_items"
    __table_args__ = (db.UniqueConstraint("user_id", "symbol", name="uq_watch_user_symbol"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    symbol = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {"id": self.id, "symbol": self.symbol, "name": self.name}


class Achievement(db.Model):
    __tablename__ = "achievements"
    __table_args__ = (
        db.UniqueConstraint("user_id", "achievement_id", name="uq_ach_user_ach"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = db.Column(db.String(60), nullable=False)
    unlocked_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "achievementId": self.achievement_id,
            "unlockedAt": self.unlocked_at.isoformat(),
        }
