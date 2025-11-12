from typing import Annotated
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.responses import JSONResponse
from datetime import timedelta

from . import auth, crud, models, schemas
from .database import SessionLocal, engine, get_db
from .auth import ACCESS_TOKEN_EXPIRE_MINUTES
from .security import verify_password

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server startup: Creating schema and tables if they don't exist yet...")
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

@app.post("/users/", response_model=schemas.User)
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

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
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
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: Annotated[schemas.User, Depends(auth.get_current_user)]):
    return current_user