import os
from pathlib import Path
from fastapi_mail import ConnectionConfig

# Ambil Env Vars
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM", "noreply@myapp.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", 1025))
MAIL_SERVER = os.getenv("MAIL_SERVER", "mailpit")

# PENJELASAN LOGIKA PATH:
# Path(__file__)        = /app/app/core/config.py
# .parent               = /app/app/core/
# .parent               = /app/app/  (Folder root aplikasi)
# / "templates"         = /app/app/templates/

TEMPLATE_FOLDER = Path(__file__).resolve().parent.parent / "templates"

# --- PERBAIKAN DISINI ---
# Cek apakah folder ada, jika tidak, buat foldernya.
# Ini mencegah error "Path does not point to a directory" saat startup.
if not TEMPLATE_FOLDER.exists():
    os.makedirs(TEMPLATE_FOLDER)
# ------------------------

conf = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=MAIL_PORT,
    MAIL_SERVER=MAIL_SERVER,
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=False,
    VALIDATE_CERTS=False,
    TEMPLATE_FOLDER=TEMPLATE_FOLDER
)