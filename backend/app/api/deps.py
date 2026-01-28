from typing import Annotated, Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import os
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import crud, models, schemas

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
  credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
  )
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username: str = payload.get("sub")
    if username is None:
      raise credentials_exception
    token_data = schemas.user.TokenData(username=username)
  except JWTError:
    raise credentials_exception
  
  user = crud.get_user_by_username(db, username=token_data.username)
  if user is None:
    raise credentials_exception
  return user

def get_current_active_superuser(
  current_user: models.User = Depends(get_current_user)
) -> models.User:
  if not current_user.is_superuser:
    raise HTTPException(
      status_code=400,
      detail="The user doesn't have enough privileges"
    )
  return current_user