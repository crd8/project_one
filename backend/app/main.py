from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
import os
from sqlalchemy import text

from app import models
from app.database import engine, SessionLocal
from app.api.v1.router import api_router

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

  models.user.Base.metadata.create_all(bind=engine)
  print("Startup complete.")

  yield

  print("Server shutdown.")

app = FastAPI(lifespan=lifespan)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
PROFILE_IMAGES_DIR = STATIC_DIR / "profile_images"

# Static files (for profile images)
os.makedirs(PROFILE_IMAGES_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# CORS settings
app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:3000"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.include_router(api_router)