from typing import Annotated
from app.core import security, tokens
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta
import pyotp
import qrcode
import io
import base64
from jose import jwt, JWTError

from app import crud, models, schemas
from app.api import deps
from app.core.tokens import ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.config import conf
from fastapi_mail import FastMail, MessageSchema, MessageType

router = APIRouter()

# ------------------ for setup 2FA ------------------
@router.post("/setup", response_model=schemas.user.TwoFactorSetupResponse)
async def setup_2fa(
  current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)],
  db: Session = Depends(deps.get_db)
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

# ------------------ for enable 2FA ------------------
@router.post("/enable")
async def enable_2fa(
  verification: schemas.user.TwoFactorVerifyRequest,
  current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)],
  db: Session = Depends(deps.get_db)
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

# ------------------ for disable 2FA ------------------
@router.post("/disable")
async def disable_2fa(
  request: schemas.user.Disable2FARequest,
  current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)],
  db: Session = Depends(deps.get_db)
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

# ------------------ for 2FA login verification ------------------
@router.post("/verify-login", response_model=schemas.user.LoginResponse)
async def verify_2fa_login(
  response: Response,
  request: Request,
  body: schemas.user.TwoFactorLoginRequest,
  db: Session = Depends(deps.get_db)
):
  try:
    payload = jwt.decode(body.temp_token, tokens.SECRET_KEY, algorithms=[tokens.ALGORITHM])
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

# ------------------ for 2FA reset request ------------------
@router.post("/request-reset")
async def request_2fa_reset(
  body: schemas.user.EmailSchema,
  db: Session = Depends(deps.get_db)
):
  user = crud.get_user_by_email(db, email=body.email)
  if not user:
    return {"message": "If the email is registered, a reset link has been sent."}
  
  if not user.is_2fa_enabled:
    return {"message": "2FA is not active on this account."}
  
  reset_token = tokens.create_access_token(
    data={"sub": user.username, "type": "2fa_reset"},
    expires_delta=timedelta(minutes=15)
  )

  reset_link = f"http://localhost:8000/auth/2fa/confirm-reset?token={reset_token}"

  message = MessageSchema(
    subject="Reset 2FA - MyApp",
    recipients=[user.email],
    template_body={
      "fullname": user.fullname,
      "link": reset_link
    },
    subtype=MessageType.html
  )

  fm = FastMail(conf)
  await fm.send_message(message, template_name="reset_2fa.html")

  return {"message": "If the email is registered, a reset link has been sent."}

# ------------------ for 2FA reset confirmation ------------------
@router.get("/confirm-reset")
async def confirm_2fa_reset(
  token: str, 
  db: Session = Depends(deps.get_db)
):
  try:
    payload = jwt.decode(token, tokens.SECRET_KEY, algorithms=[tokens.ALGORITHM])
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