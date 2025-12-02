from sqlalchemy.orm import Session
from . import models, schemas, security
from datetime import datetime
import uuid

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        fullname=user.fullname,
        hashed_password=hashed_password,
        is_active=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_refresh_token(db: Session, user_id: uuid.UUID, token: str, expires_at: datetime, user_agent: str = None, ip_address: str = None):
    hashed_token = security.get_password_hash(token)
    db_token = models.RefreshToken(
        user_id=user_id,
        token_hash=hashed_token,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def get_user_active_sessions(db: Session, user_id: uuid.UUID):
    return db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user_id).all()

def delete_session_by_id(db: Session, session_id: uuid.UUID, user_id: uuid.UUID):
    session = db.query(models.RefreshToken).filter(
        models.RefreshToken.id == session_id,
        models.RefreshToken.user_id == user_id
    ).first()
    if session:
        db.delete(session)
        db.commit()
        return True
    return False

def get_refresh_token(db: Session, token: str, user: models.User):
    for db_token in user.refresh_tokens:
        if security.verify_password(token, db_token.token_hash):
            return db_token
    return None

def delete_refresh_token(db: Session, token: str, user: models.User):
    db_token = get_refresh_token(db, token, user)
    if db_token:
        db.delete(db_token)
        db.commit()
    return db_token

def delete_refresh_token_by_hash(db: Session, token_hash: str):
    db_token = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == token_hash).first()
    if db_token:
        db.delete(db_token)
        db.commit()
    return db_token

def delete_all_refresh_tokens_by_user(db: Session, user_id: uuid.UUID):
    db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user_id).delete()
    db.commit()