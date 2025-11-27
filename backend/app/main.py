from typing import Annotated
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, status, Response, Request, Cookie, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import timedelta
from jose import JWTError, jwt

import redis.asyncio as redis
import pyotp
import qrcode
import io
import base64
import uuid

from . import auth, crud, models, schemas, security
from .database import SessionLocal, engine, get_db
from .auth import ACCESS_TOKEN_EXPIRE_MINUTES
from .security import verify_password

conf = ConnectionConfig(
  MAIL_USERNAME="",
  MAIL_PASSWORD="",
  MAIL_FROM="noreply@myapp.com",
  MAIL_PORT="1025",
  MAIL_SERVER="mailpit", #nama service di docker-compose
  MAIL_STARTTLS=False,
  MAIL_SSL_TLS=False,
  USE_CREDENTIALS=False,
  VALIDATE_CERTS=False,
)

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
def create_user(
  user: schemas.UserCreate,
  background_tasks: BackgroundTasks,
  db: Session = Depends(get_db)
):
  errors = []
  db_user_by_email = crud.get_user_by_email(db, email=user.email)
  if db_user_by_email:
    errors.append({"field": "email", "message": "Email already registered"})
  
  db_user_by_username = crud.get_user_by_username(db, username=user.username)
  if db_user_by_username:
    errors.append({"field": "username", "message": "Username already taken"})

  new_user = crud.create_user(db=db, user=user)

  verify_token = auth.create_access_token(
    data={"sub": new_user.username, "type": "email_verification"},
    expires_delta=timedelta(hours=24)
  )

  verify_link = f"http://localhost:8000/auth/verify-email?token={verify_token}"

  html = f"""
  <h3>WELCOME, {new_user.fullname}!</h3>
  <p>Thank you for registering. Please click the button below to activate your account:</p>
  <a href="{verify_link}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Email Verification</a>
  <p>Link valid for 24 hours.</p>
  """

  message = MessageSchema(
    subject="MyApp Account Verification",
    recipients=[new_user.email],
    body=html,
    subtype=MessageType.html
  )
  
  fm = FastMail(conf)
  background_tasks.add_task(fm.send_message, message)
  
  return new_user
  
  # if errors:
  #   return JSONResponse(
  #     status_code=status.HTTP_400_BAD_REQUEST,
  #     content={"errors": errors},
  #   )
  # return crud.create_user(db=db, user=user)

@app.get("/auth/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
  try:
    payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    username: str = payload.get("sub")
    token_type: str = payload.get("type")
      
    if username is None or token_type != "email_verification":
      raise HTTPException(status_code=400, detail="Token invalid")
  except JWTError:
    raise HTTPException(status_code=400, detail="Token expired or invalid")
      
  user = crud.get_user_by_username(db, username=username)
  if not user:
    raise HTTPException(status_code=404, detail="User not found")
      
  if user.is_active:
    return JSONResponse(content={"message": "The account is already active. Please log in."})
      
  user.is_active = True
  db.commit()
  
  return JSONResponse(content={"message": "Email successfully verified! Your account is now active."})

@app.post("/auth/2fa/setup", response_model=schemas.TwoFactorSetuoResponse)
async def setup_2fa(
  current_user: Annotated[schemas.User, Depends(auth.get_current_user)],
  db: Session = Depends(get_db)
):
  secret = pyotp.random_base32()

  db_user = db.query(models.User).filter(models.User.id == current_user.id).first()
  db_user.totp_secret = secret
  db.commit()

  uri = pyotp.totp.TOTP(secret).provisioning_uri(
    name=current_user.email,
    issuer_name="MyApp"
  )

  img = qrcode.make(uri)
  buffered = io.BytesIO()
  img.save(buffered, format="PNG")
  img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

  return{ "secret": secret, "qr_code": img_str }

@app.post("/auth/2fa/enable")
async def enable_2fa(
  verification: schemas.TwoFactorVerifyRequest,
  current_user: Annotated[schemas.User, Depends(auth.get_current_user)],
  db: Session = Depends(get_db)
):
  db_user = db.query(models.User).filter(models.User.id == current_user.id).first()

  if not db_user.totp_secret:
    raise HTTPException(
      status_code=400,
      detail="setup 2FA first"
    )
  
  totp = pyotp.TOTP(db_user.totp_secret)
  if not totp.verify(verification.code, valid_window=1):
    raise HTTPException(
      status_code=400,
      detail="Invalid 2FA code"
    )
  
  db_user.is_2fa_enabled = True
  db.commit()
  return {"message": "2FA enabled successfully"}

@app.post("/auth/2fa/disable")
async def disable_2fa(
  request: schemas.Disable2FARequest,
  current_user: Annotated[schemas.User, Depends(auth.get_current_user)],
  db: Session = Depends(get_db)
):
  db_user = db.query(models.User).filter(models.User.id == current_user.id).first()

  if not security.verify_password(request.password, db_user.hashed_password):
    raise HTTPException(
      status_code=400,
      detail="Incorrect password. Unable to disable 2FA."
    )

  db_user.is_2fa_enabled = False
  db_user.totp_secret = None
  db.commit()

  return {"message": "2FA has been disabled"}

@app.post("/auth/2fa/request-reset")
async def request_2fa_reset(
  body: schemas.EmailSchema,
  db: Session = Depends(get_db)
):
  user = crud.get_user_by_email(db, email=body.email)
  if not user:
    return {"message": "If the email is registered, a reset link has been sent."}
  
  if not user.is_2fa_enabled:
    return {"message": "2FA is not active on this account."}
  
  reset_token = auth.create_access_token(
    data={"sub": user.username, "type": "2fa_reset"},
    expires_delta=timedelta(minutes=15)
  )

  reset_link = f"http://localhost:8000/auth/2fa/confirm-reset?token={reset_token}"

  html = f"""
  <p>Hello {user.fullname},</p>
  <p>Someone asked to turn off 2FA on your account.</p>
  <p>If this is you, please click the link below to turn off 2FA:</p>
  <a href="{reset_link}">Turn Off My 2FA</a>
  <p>This link expires in 15 minutes.</p>
  """

  message = MessageSchema(
    subject="Reset 2FA - MyApp",
    recipients=[user.email],
    body=html,
    subtype=MessageType.html
  )

  fm = FastMail(conf)
  await fm.send_message(message)

  return {"message": "If the email is registered, a reset link has been sent."}

@app.get("/auth/2fa/confirm-reset")
async def confirm_2fa_reset(
  token: str, 
  db: Session = Depends(get_db)
):
  try:
    payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    username: str = payload.get("sub")
    token_type: str = payload.get("type")

    if username is None or token_type != "2fa_reset":
      raise HTTPException(
        status_code=400,
        detail="Invalid token"
      )
  
  except JWTError:
    return RedirectResponse(url="http://localhost:3000/login?status=invalid_token")
  
  user = crud.get_user_by_username(db, username=username)
  if not user:
    raise HTTPException(
      status_code=404,
      detail="user not found"
    )
  
  user.is_2fa_enabled = False
  user.totp_secret = None
  db.commit()

  return RedirectResponse(url="http://localhost:3000/login?status=reset_success")

@app.post("/token", response_model=schemas.LoginResponse, dependencies=[Depends(RateLimiter(times=5, minutes=1))])
async def login_for_access_token(
  response: Response,
  request: Request,
  form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
  db: Session = Depends(get_db)
):
  user = crud.get_user_by_username(db, username=form_data.username)
  if not user or not verify_password(form_data.password, user.hashed_password) or not user.is_active:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Incorrect username or password",
      headers={"WWW-Authenticate": "Bearer"},
    )
  
  user_agent = request.headers.get("user-agent")
  ip_address = request.client.host
  
  if user.is_2fa_enabled:
    temp_token = auth.create_access_token(
      data={"sub": user.username, "type": "pre_auth"},
      expires_delta=timedelta(minutes=5),
    )
    return {"require_2fa": True, "temp_token": temp_token}

  expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  access_token = auth.create_access_token(
    data={"sub": user.username},
    expires_delta=expires_delta,
  )

  refresh_token_plain, refresh_token_expires_at = auth.create_refresh_token_and_save(
    db,
    user_id=user.id,
    user_agent=user_agent,
    ip_address=ip_address
  )

  response.set_cookie(
    key="refresh_token",
    value=refresh_token_plain,
    httponly=True,
    secure=False,
    expires=refresh_token_expires_at,
    samesite="lax",
  )

  return {"access_token": access_token, "user": user, "require_2fa": False}

@app.post("/auth/2fa/verify-login", response_model=schemas.LoginResponse)
async def verify_2fa_login(
  response: Response,
  request: Request,
  body: schemas.TwoFactorLoginRequest,
  db: Session = Depends(get_db)
):
  try:
    payload = jwt.decode(body.temp_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    username: str = payload.get("sub")
    token_type: str = payload.get("type")
    if username is None or token_type != "pre_auth":
      raise HTTPException(
        status_code=401,
        detail="Invalid temporary token"
      )
  except JWTError:
    raise HTTPException(
      status_code=401,
      detail="Invalid temporary token"
    )
  
  user = crud.get_user_by_username(db, username=username)

  totp = pyotp.TOTP(user.totp_secret)
  if not totp.verify(body.code, valid_window=1):
    raise HTTPException(
      status_code=400,
      detail="Invalid TOTP code"
    )
  
  user_agent = request.headers.get("user-agent")
  ip_address = request.client.host
  
  expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  access_token = auth.create_access_token(
    data={"sub": user.username},
    expires_delta=expires_delta,
  )

  refresh_token_plain, refresh_token_expires_at = auth.create_refresh_token_and_save(
    db,
    user_id=user.id,
    user_agent=user_agent,
    ip_address=ip_address
  )

  response.set_cookie(
    key="refresh_token",
    value=refresh_token_plain,
    httponly=True,
    secure=False,
    expires=refresh_token_expires_at,
    samesite="lax",
  )

  return {"access_token": access_token, "user": user, "require_2fa": False}\
  
@app.get("/auth/sessions", response_model=list[schemas.SessionResponse])
async def get_active_sessions(
  request: Request,
  current_user: Annotated[schemas.User, Depends(auth.get_current_user)],
  db: Session = Depends(get_db)
):
  sessions = crud.get_user_active_sessions(db, user_id=current_user.id)

  current_refresh_token = request.cookies.get("refresh_token")

  result = []
  for s in sessions:
    is_current = False
    if current_refresh_token and security.verify_password(current_refresh_token, s.token_hash):
      is_current = True 

    result.append(schemas.SessionResponse(
      id=s.id,
      user_agent=s.user_agent,
      ip_address=s.ip_address,
      created_at=s.created_at,
      expires_at=s.expires_at,
      is_current=is_current
    ))

  return result

@app.delete("/auth/sessions/{session_id}")
async def revoke_session(
  session_id: str,
  current_user: Annotated[schemas.User, Depends(auth.get_current_user)],
  db: Session = Depends(get_db)
):
  try:
    s_id = uuid.UUID(session_id)
  except ValueError:
    raise HTTPException(
      status_code=400,
      detail="Invalid session ID format"
    )
  
  success = crud.delete_session_by_id(db, session_id=s_id, user_id=current_user.id)
  if not success:
    raise HTTPException(
      status_code=404,
      detail="Session not found"
    )
  
  return {"message": "Session revoked successfully"}
    
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