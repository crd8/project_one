from typing import Annotated
from app.core import security, tokens
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import jwt, JWTError
import uuid

from app import crud, models, schemas
from app.api import deps
from app.core.tokens import ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.config import conf
from fastapi_mail import FastMail, MessageSchema, MessageType

router = APIRouter()

# ------------------ for login ------------------
@router.post("/login", response_model=schemas.user.LoginResponse)
async def login_for_access_token(
  response: Response,
  request: Request,
  form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
  db: Session = Depends(deps.get_db)
):
  user = crud.user.get_user_by_username(db, username=form_data.username)

  if not user or not security.verify_password(form_data.password, user.hashed_password):
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Incorrect username or password",
      headers={"WWW-Authenticate": "Bearer"},
    )
  
  if not user.is_active:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="Account is not active. Please verify your email.",
      headers={"WWW-Authenticate": "Bearer"},
    )
  
  user_agent = request.headers.get("user-agent")
  ip_address = request.client.host
  
  if user.is_2fa_enabled:
    temp_token = tokens.create_access_token(
      data={"sub": user.username, "type": "pre_auth"},
      expires_delta=timedelta(minutes=5),
    )
    return {"require_2fa": True, "temp_token": temp_token}

  expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  access_token = tokens.create_access_token(
    data={"sub": user.username},
    expires_delta=expires_delta,
  )

  refresh_token_plain, refresh_token_expires_at = tokens.create_refresh_token_and_save(
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

# ------------------ for refresh access token ------------------
@router.post("/refresh", response_model=schemas.user.Token)
async def refresh_access_token(
  refresh_token: Annotated[str | None, Cookie()] = None,
  db: Session = Depends(deps.get_db)
):
  if not refresh_token:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="No refresh token provided",
    )
  
  user = tokens.verify_refresh_token(db, refresh_token)
  if not user:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid or expired refresh token",
    )
  
  expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  access_token = tokens.create_access_token(
    data={"sub": user.username},
    expires_delta=expires_delta,
  )
  
  return {"access_token": access_token, "token_type": "bearer"}

# ------------------ for logout ------------------
@router.post("/logout")
async def logout(
  response: Response,
  refresh_token: Annotated[str | None, Cookie()] = None,
  db: Session = Depends(deps.get_db)
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

# ------------------ for email verification ------------------
@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(deps.get_db)):
  try:
    payload = jwt.decode(token, tokens.SECRET_KEY, algorithms=[tokens.ALGORITHM])
    username: str = payload.get("sub")
    token_type: str = payload.get("type")
      
    if username is None or token_type != "email_verification":
      return RedirectResponse(url="http://localhost:3000/login?status=invalid_token")
  except JWTError:
    return RedirectResponse(url="http://localhost:3000/login?status=invalid_token")
      
  user = crud.user.get_user_by_username(db, username=username)
  if not user:
    return RedirectResponse(url="http://localhost:3000/login?status=invalid_token")
      
  if user.is_active:
    return RedirectResponse(url="http://localhost:3000/login?status=already_active")
      
  user.is_active = True
  db.commit()
  
  return RedirectResponse(url="http://localhost:3000/login?status=email_verified")

# ------------------ for password reset request ------------------
@router.post("/password-reset/request")
async def request_password_reset(
  body: schemas.user.EmailSchema,
  db: Session = Depends(deps.get_db),
):
  user = crud.user.get_user_by_email(db, email=body.email)

  if not user:
    return {"message": "If the email is registered, a password reset link has been sent."}
  
  reset_token = tokens.create_access_token(
    data={"sub": user.username, "type": "password_reset"},
    expires_delta=timedelta(minutes=15)
  )

  reset_link = f"http://localhost:3000/reset-password?token={reset_token}"

  message = MessageSchema(
    subject="Reset Password = MyApp",
    recipients=[user.email],
    template_body={
      "fullname": user.fullname,
      "link": reset_link
    },
    subtype=MessageType.html
  )

  fm = FastMail(conf)
  await fm.send_message(message, template_name="reset_password.html")

  return {"message": "If the email is registered, a password reset link has been sent."}

# ------------------ for password reset confirmation ------------------
@router.post("/password-reset/confirm")
async def confirm_password_reset(
  body: schemas.user.PasswordResetConfirm,
  db: Session = Depends(deps.get_db)
):
  try:
    payload = jwt.decode(body.token, tokens.SECRET_KEY, algorithms=[tokens.ALGORITHM])
    username: str = payload.get("sub")
    token_type: str = payload.get("type")

    if username is None or token_type != "password_reset":
      raise HTTPException(
        status_code=400,
        detail="Invalid token type"
      )
  except JWTError:
    raise HTTPException(
      status_code=400,
      detail="Token expired or invalid"
    )
  
  user = crud.user.get_user_by_username(db, username=username)
  if not user:
    raise HTTPException(
      status_code=404,
      detail="User not found"
    )
  
  user.hashed_password = security.get_password_hash(body.new_password)
  db.commit()

  crud.user.delete_all_refresh_tokens_by_user(db, user_id=user.id)

  return {"message": "Password has been reset successfully. Please log in with your new password."}

# ------------------ for get active sessions ------------------
@router.get("/sessions", response_model=list[schemas.user.SessionResponse])
async def get_active_sessions(
  request: Request,
  current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)],
  db: Session = Depends(deps.get_db)
):
  sessions = crud.user.get_user_active_sessions(db, user_id=current_user.id)

  current_refresh_token = request.cookies.get("refresh_token")

  result = []
  for s in sessions:
    is_current = False
    if current_refresh_token and security.verify_password(current_refresh_token, s.token_hash):
      is_current = True 

    result.append(schemas.user.SessionResponse(
      id=s.id,
      user_agent=s.user_agent,
      ip_address=s.ip_address,
      created_at=s.created_at,
      expires_at=s.expires_at,
      is_current=is_current
    ))

  return result

# ------------------ for revoke session ------------------
@router.delete("/sessions/{session_id}")
async def revoke_session(
  session_id: str,
  current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)],
  db: Session = Depends(deps.get_db)
):
  try:
    s_id = uuid.UUID(session_id)
  except ValueError:
    raise HTTPException(
      status_code=400,
      detail="Invalid session ID format"
    )
  
  success = crud.user.delete_session_by_id(db, session_id=s_id, user_id=current_user.id)
  if not success:
    raise HTTPException(
      status_code=404,
      detail="Session not found"
    )
  
  return {"message": "Session revoked successfully"}