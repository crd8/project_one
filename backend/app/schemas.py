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
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None