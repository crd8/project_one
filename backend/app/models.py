from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .database import Base

class User(Base):
  __tablename__ = "users"
  __table_args__ = {'schema': 'myapp'}

  id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  username = Column(String, unique=True, index=True, nullable=False)
  fullname = Column(String, nullable=False)
  email = Column(String, unique=True, index=True, nullable=False)
  new_email = Column(String, nullable=True)
  hashed_password = Column(String, nullable=False)
  totp_secret = Column(String, nullable=True)
  is_2fa_enabled = Column(Boolean, default=False)
  is_active = Column(Boolean, default=True)
  is_superuser = Column(Boolean, default=False)
  created_at = Column(DateTime(timezone=True), server_default=func.now())
  updated_at = Column(DateTime(timezone=True), onupdate=func.now())

  refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
  __tablename__ = "refresh_tokens"
  __table_args__ = {'schema': 'myapp'}

  id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  user_id = Column(UUID(as_uuid=True), ForeignKey('myapp.users.id'), nullable=False)
  token_hash = Column(String, unique=True, index=True, nullable=False)
  created_at = Column(DateTime(timezone=True), server_default=func.now())
  expires_at = Column(DateTime(timezone=True), nullable=False)
  user_agent = Column(String, nullable=True)
  ip_address = Column(String, nullable=True)

  user = relationship("User", back_populates="refresh_tokens")