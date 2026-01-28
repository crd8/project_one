from typing import Annotated
from app.core import security, tokens
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from pathlib import Path
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta
import shutil
import os
import glob
from jose import jwt, JWTError

from app import schemas, crud, models
from app.api import deps
from app.core.config import conf
from fastapi_mail import FastMail, MessageSchema, MessageType

router = APIRouter()

# ------------------ for user registration ------------------
@router.post("/", response_model=schemas.user.User)
def create_user(
  user: schemas.user.UserCreate,
  background_tasks: BackgroundTasks,
  db: Session = Depends(deps.get_db)
):
  errors = []
  db_user_by_email = crud.user.get_user_by_email(db, email=user.email)
  if db_user_by_email:
    errors.append({"field": "email", "message": "Email already registered"})
  
  db_user_by_username = crud.user.get_user_by_username(db, username=user.username)
  if db_user_by_username:
    errors.append({"field": "username", "message": "Username already taken"})

  if errors:
    raise HTTPException(
      status_code=400,
      detail=errors
    )

  new_user = crud.user.create_user(db=db, user=user)

  verify_token = tokens.create_access_token(
    data={"sub": new_user.username, "type": "email_verification"},
    expires_delta=timedelta(hours=24)
  )

  verify_link = f"http://localhost:8000/auth/verify-email?token={verify_token}"

  message = MessageSchema(
    subject="MyApp Account Verification",
    recipients=[new_user.email],
    template_body={
      "fullname": new_user.fullname,
      "link": verify_link
    },
    subtype=MessageType.html
  )
  
  fm = FastMail(conf)
  background_tasks.add_task(fm.send_message, message, template_name="verify_email.html")
  
  return new_user

@router.get("/me", response_model=schemas.user.User)
async def read_users_me(current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)]):
  return current_user

# ------------------ for update fullname ------------------
@router.put("/me/profile", response_model=schemas.user.User)
async def update_user_profile(
  body: schemas.user.UserProfileUpdate,
  current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)],
  db: Session = Depends(deps.get_db)
):
  
  db_user = db.query(models.User).filter(models.User.id == current_user.id).first()
  db_user.fullname = body.fullname
  db.commit()
  db.refresh(db_user)
  return db_user

# ------------------ for upload profile image ------------------
@router.post("/me/avatar", response_model=schemas.user.User)
async def upload_avatar(
  current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)],
  db: Session = Depends(deps.get_db),
  file: UploadFile = File(...)
):
  
  if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
    raise HTTPException(
      status_code=400,
      detail="Invalid image format. Only JPEG, PNG, and WEBP are allowed."
    )
  
  # Logika: .parent(endpoints) -> .parent(v1) -> .parent(api) -> .parent(app)
  BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
  
  # Target folder: app/static/profile_images
  PROFILE_IMAGES_DIR = BASE_DIR / "static" / "profile_images"
  
  # Pastikan folder dibuat jika belum ada
  PROFILE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

  file_pattern = os.path.join(PROFILE_IMAGES_DIR, f"avatar_{current_user.id}.*")

  existing_files = glob.glob(file_pattern)

  for f in existing_files:
    try:
      os.remove(f)
      print(f"Deleted old avatar file: {f}")
    except OSError as e:
      print(f"Error deleting file {f}: {e}")
      
  file_ext = file.filename.split(".")[-1]
  filename = f"avatar_{current_user.id}.{file_ext}"
  file_path = os.path.join(PROFILE_IMAGES_DIR, filename)

  try:
    with open(file_path, "wb") as buffer:
      shutil.copyfileobj(file.file, buffer)
  except Exception:
    raise HTTPException(
      status_code=500,
      detail="Failed to save image."
    )
  
  db_user = db.query(models.User).filter(models.User.id == current_user.id).first()
    
  image_url = f"/static/profile_images/{filename}"
  db_user.profile_image = image_url
  
  db.commit()
  db.refresh(db_user)
  
  return db_user

# ------------------ for change email ------------------
@router.put("/me/email", response_model=schemas.user.User)
async def request_email_change(
  body: schemas.user.UserEmailUpdate,
  background_tasks: BackgroundTasks,
  current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)],
  db: Session = Depends(deps.get_db)
):
  db_user = db.query(models.User).filter(models.User.id == current_user.id).first()

  if not security.verify_password(body.password, db_user.hashed_password):
    raise HTTPException(status_code=400, detail="Incorrect password.")

  if body.new_email == db_user.email:
    raise HTTPException(status_code=400, detail="The new email is the same as the old email.")

  existing_user = crud.user.get_user_by_email(db, email=body.new_email)
  if existing_user:
    raise HTTPException(status_code=400, detail="This email address is already in use.")

  db_user.new_email = body.new_email
  
  verify_token = tokens.create_access_token(
    data={"sub": db_user.username, "new_email": body.new_email, "type": "change_email"},
    expires_delta=timedelta(hours=1)
  )
  verify_link = f"http://localhost:8000/users/verify-change-email?token={verify_token}"

  fm = FastMail(conf)

  msg_verify = MessageSchema(
    subject="New Email Verification - MyApp",
    recipients=[body.new_email],
    template_body={
      "fullname": db_user.fullname,
      "new_email": body.new_email,
      "link": verify_link
    },
    subtype=MessageType.html
  )
  background_tasks.add_task(fm.send_message, msg_verify, template_name="change_email.html")

  msg_alert = MessageSchema(
    subject="Security Alert: Email Change Request",
    recipients=[db_user.email],
    template_body={
      "fullname": db_user.fullname, 
      "change_type": "Email Address",
      "detail": f"changing the email address to {body.new_email}"
    },
    subtype=MessageType.html
  )
  background_tasks.add_task(fm.send_message, msg_alert, template_name="alert.html")

  db.commit()
  db.refresh(db_user)
  return db_user

# ------------------ for change email verification ------------------
@router.get("/verify-change-email")
async def verify_change_email(token: str, db: Session = Depends(deps.get_db)):
  try:
    payload = jwt.decode(token, tokens.SECRET_KEY, algorithms=[tokens.ALGORITHM])
    username: str = payload.get("sub")
    new_email_from_token: str = payload.get("new_email")
    token_type: str = payload.get("type")

    if not username or not new_email_from_token or token_type != "change_email":
      return RedirectResponse(url="http://localhost:3000/profile?status=invalid_token")
          
  except JWTError:
    return RedirectResponse(url="http://localhost:3000/profile?status=invalid_token")

  user = crud.user.get_user_by_username(db, username=username)
  if not user:
    return RedirectResponse(url="http://localhost:3000/profile?status=error")

  if user.new_email != new_email_from_token:
    return RedirectResponse(url="http://localhost:3000/profile?status=invalid_token")

  user.email = user.new_email
  user.new_email = None
  
  db.commit()

  return RedirectResponse(url="http://localhost:3000/profile?status=email_updated")

# ------------------ for change password ------------------
@router.post("/me/password")
async def change_password(
  body: schemas.user.ChangePasswordRequest,
  current_user: Annotated[schemas.user.User, Depends(deps.get_current_user)],
  db: Session = Depends(deps.get_db)
):
  
  db_user = db.query(models.User).filter(models.User.id == current_user.id).first()

  if not security.verify_password(body.current_password, db_user.hashed_password):
    raise HTTPException(
      status_code=400,
      detail="Current password is incorrect"
    )
  
  db_user.hashed_password = security.get_password_hash(body.new_password)
  db.commit()
  return {"message": "Password changed successfully"}