import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SIGA_TOKEN = os.getenv("SIGA_TOKEN", "83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eLA")
SIGA_BASE_URL = "https://api.sigacrm.com.br/kpg"
SIGA_HEADERS = {
    "Authorization": f"Bearer {SIGA_TOKEN}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

INSTAGRAM_ACCESS_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN", "")
INSTAGRAM_ACCOUNT_ID = os.getenv("INSTAGRAM_ACCOUNT_ID", "")
INSTAGRAM_API_VERSION = "v19.0"
INSTAGRAM_BASE_URL = f"https://graph.facebook.com/{INSTAGRAM_API_VERSION}"

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY", "")

CRIATIVOS_DIR = os.path.join(os.path.dirname(__file__), "criativos")
os.makedirs(CRIATIVOS_DIR, exist_ok=True)

# Paleta KPG Imóveis
KPG_PRIMARY = (26, 44, 78)       # #1A2C4E - Azul escuro
KPG_ACCENT = (200, 168, 75)      # #C8A84B - Dourado
KPG_WHITE = (255, 255, 255)
KPG_OVERLAY = (15, 25, 45, 200)  # Azul escuro semi-transparente

FONT_DIR = "C:\\Windows\\Fonts"
FONT_BOLD = os.path.join(FONT_DIR, "arialbd.ttf")
FONT_REGULAR = os.path.join(FONT_DIR, "arial.ttf")
