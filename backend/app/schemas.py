from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import datetime

class UserCreate(BaseModel):
  username: str
  fullname: str
  email: EmailStr
  password: str

class User(BaseModel):
  id: uuid.UUID
  username: str
  fullname: str
  email: EmailStr
  is_active: bool
  is_superuser: bool
  is_2fa_enabled: bool
  created_at: datetime
  updated_at: Optional[datetime]
  profile_image: Optional[str] = None

  class Config:
    from_attributes = True

class EmailSchema(BaseModel):
  email: EmailStr

class TwoFactorSetuoResponse(BaseModel):
  secret: str
  qr_code: str

class TwoFactorVerifyRequest(BaseModel):
  code: str

class TwoFactorLoginRequest(BaseModel):
  temp_token: str
  code: str

class Disable2FARequest(BaseModel):
  password: str

class LoginResponse(BaseModel):
  user: Optional[User] = None
  access_token: Optional[str] = None
  require_2fa: bool = False
  temp_token: Optional[str] = None

class SessionResponse(BaseModel):
  id: uuid.UUID
  user_agent: str | None
  ip_address: str | None
  created_at: datetime
  expires_at: datetime
  is_current: bool = False

class Token(BaseModel):
  access_token: str
  token_type: str

class TokenData(BaseModel):
  username: str | None = None

class PasswordResetConfirm(BaseModel):
  token: str
  new_password: str

class UserProfileUpdate(BaseModel):
  fullname: str

class UserEmailUpdate(BaseModel):
  new_email: EmailStr
  password: str

class ChangePasswordRequest(BaseModel):
  current_password: str
  new_password: str