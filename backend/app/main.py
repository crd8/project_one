from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.responses import JSONResponse

from . import auth, crud, models, schemas
from .database import SessionLocal, engine, get_db

db_conn = SessionLocal()
db_conn.execute(text("CREATE SCHEMA IF NOT EXISTS myapp"))
db_conn.commit()
db_conn.close()

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

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
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: Annotated[schemas.User, Depends(auth.get_current_user)]):
    return current_user