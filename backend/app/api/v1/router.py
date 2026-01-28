from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, totp

api_router = APIRouter()

# Auth: Login, Refresh, Logout, Verify Email, Password Reset, Sessions
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"]) 

# 2FA: Setup, Enable, Disable, Login Verify
api_router.include_router(totp.router, prefix="/auth/2fa", tags=["Two Factor Auth"])

# Users: CRUD, Profile, Avatar, Change Email, Change Password
api_router.include_router(users.router, prefix="/users", tags=["Users"])