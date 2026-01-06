"""
Database models for users, Kolam history, and chat
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, server_default="learner")  # learner, telecom, kcaptcha, merch
    company_name = Column(String(100), nullable=True)  # Only for telecom role
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    kolam_history = relationship("KolamHistory", back_populates="user")
    sent_messages = relationship("ChatMessage", foreign_keys="ChatMessage.sender_id", back_populates="sender")


class KolamHistory(Base):
    __tablename__ = "kolam_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    kolam_params = Column(JSON, nullable=False)
    kolam_image_path = Column(String(255))
    kolam_config_path = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="kolam_history")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_a_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_b_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    messages = relationship("ChatMessage", back_populates="session")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    encrypted_payload = Column(JSON, nullable=False)  # Stores chunks, hashes, matrices, etc.
    decrypted_message = Column(Text)  # Store decrypted message for history
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")


class KolamRegistry(Base):
    """
    Separate reference database for verification.
    Maps Kolam Image Hash -> JSON Config.
    Used to ensure both parties possess the EXACT same Kolam configuration.
    """
    __tablename__ = "kolam_registry"

    id = Column(Integer, primary_key=True, index=True)
    image_hash = Column(String(64), unique=True, index=True, nullable=False) # SHA256 of image file
    json_config = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

