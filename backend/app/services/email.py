from fastapi_mail import FastMail, MessageSchema, MessageType
from app.core.config import conf

# ------------------ for sending unlock email ------------------
async def send_unlock_email(email: str, fullname: str, token: str):
  unlock_link = f"http://localhost:3000/login?unlock_token={token}"
  message = MessageSchema(
    subject="account locked - MyApp",
    recipients=[email],
    template_body={
      "fullname": fullname,
      "link": unlock_link
    },
    subtype=MessageType.html
  )
  fm = FastMail(conf)
  await fm.send_message(message, template_name="unlock_account.html")

# ------------------ for sending reset password email ------------------
async def send_reset_password_email(email: str, fullname: str, token: str):
  reset_link = f"http://localhost:3000/reset-password?token={token}"
  message = MessageSchema(
    subject="Reset Password - MyApp",
    recipients=[email],
    template_body={
      "fullname": fullname,
      "link": reset_link
    },
    subtype=MessageType.html
  )
  fm = FastMail(conf)
  await fm.send_message(message, template_name="reset_password.html")

# ------------------ for sending verification email ------------------
async def send_verification_email(email: str, fullname: str, token: str):
  verification_link = f"http://localhost:3000/verify-email?token={token}"
  message = MessageSchema(
    subject="Verify Your Email - MyApp",
    recipients=[email],
    template_body={
      "fullname": fullname,
      "link": verification_link
    },
    subtype=MessageType.html
  )
  fm = FastMail(conf)
  await fm.send_message(message, template_name="verify_email.html")

# ------------------ for sending email change verification email ------------------
async def send_email_change_verify(email: str, fullname: str, token: str):
  verification_link = f"http://localhost:3000/verify-email-change?token={token}"
  message = MessageSchema(
    subject="Verify Your New Email - MyApp",
    recipients=[email],
    template_body={
      "fullname": fullname,
      "link": verification_link
    },
    subtype=MessageType.html
  )
  fm = FastMail(conf)
  await fm.send_message(message, template_name="change_email.html")

# ------------------ for sending email change alert email ------------------
async def send_email_change_alert(email: str, fullname: str, new_email: str):
  message = MessageSchema(
      subject="Security Alert: Email Change Request",
      recipients=[email],
      template_body={
          "fullname": fullname, 
          "change_type": "Email Address",
          "detail": f"changing the email address to {new_email}"
      },
      subtype=MessageType.html
  )
  fm = FastMail(conf)
  await fm.send_message(message, template_name="alert.html")

# ------------------ for sending 2FA reset email ------------------
async def send_reset_2fa_email(email: str, fullname: str, token: str):
  reset_link = f"http://localhost:8000/auth/2fa/confirm-reset?token={token}"
  message = MessageSchema(
      subject="Reset 2FA - MyApp",
      recipients=[email],
      template_body={"fullname": fullname, "link": reset_link},
      subtype=MessageType.html
  )
  fm = FastMail(conf)
  await fm.send_message(message, template_name="reset_2fa.html")

# ------------------ for sending 2FA disabled alert email ------------------
async def send_2fa_disabled_alert(email: str, fullname: str):
  message = MessageSchema(
      subject="Security Alert: 2FA Disabled",
      recipients=[email],
      template_body={
          "fullname": fullname, 
          "change_type": "Two-Factor Authentication (2FA)",
          "detail": "disabling the Two-Factor Authentication on your account. If this was not you, please secure your account immediately."
      },
      subtype=MessageType.html
  )
  fm = FastMail(conf)
  await fm.send_message(message, template_name="alert.html")