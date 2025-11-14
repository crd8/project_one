from typing import Annotated
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, status, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.responses import JSONResponse
from datetime import timedelta

import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

from . import auth, crud, models, schemas, security
from .database import SessionLocal, engine, get_db
from .auth import ACCESS_TOKEN_EXPIRE_MINUTES
from .security import verify_password

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server startup: Creating schema and tables if they don't exist yet...")

    try:
        redis_conn = redis.from_url("redis://redis:6379", encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(redis_conn)
        print("Redis connection successful and FastAPILimiter initialized.")
    except Exception as e:
        print(f"Could not connect to Redis: {e}")
    with SessionLocal() as db_conn:
        db_conn.execute(text("CREATE SCHEMA IF NOT EXISTS myapp"))
        db_conn.commit()

    models.Base.metadata.create_all(bind=engine)
    print("Startup complete.")

    yield

    print("Server shutdown.")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/users/", response_model=schemas.User, dependencies=[Depends(RateLimiter(times=10, hours=1))])
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    errors = []
    db_user_by_email = crud.get_user_by_email(db, email=user.email)
    if db_user_by_email:
        errors.append({"field": "email", "message": "Email already registered"})
    
    db_user_by_username = crud.get_user_by_username(db, username=user.username)
    if db_user_by_username:
        errors.append({"field": "username", "message": "Username already taken"})
    
    if errors:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"errors": errors},
        )
    return crud.create_user(db=db, user=user)

@app.post("/token", response_model=schemas.LoginResponse, dependencies=[Depends(RateLimiter(times=5, minutes=1))])
async def login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)
):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password) or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username},
        expires_delta=expires_delta,
    )

    refresh_token_plain, refresh_token_expires_at = auth.create_refresh_token_and_save(db, user_id=user.id)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token_plain,
        httponly=True,
        secure=False,
        expires=refresh_token_expires_at,
        samesite="lax",
    )

    return {"access_token": access_token, "user": user}

@app.post("/token/refresh", response_model=schemas.Token)
async def refresh_access_token(
    refresh_token: Annotated[str | None, Cookie()] = None,
    db: Session = Depends(get_db)
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
        )
    
    user = auth.verify_refresh_token(db, refresh_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username},
        expires_delta=expires_delta,
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/logout")
async def logout(
    response: Response,
    refresh_token: Annotated[str | None, Cookie()] = None,
    db: Session = Depends(get_db)
):
    if refresh_token:
        all_tokens = db.query(models.RefreshToken).all()
        for db_token in all_tokens:
            if security.verify_password(refresh_token, db_token.token_hash):
                db.delete(db_token)
                db.commit()
                break
    
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: Annotated[schemas.User, Depends(auth.get_current_user)]):
    return current_user