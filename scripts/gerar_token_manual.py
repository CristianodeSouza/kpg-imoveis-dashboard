"""
gerar_token_manual.py — Gera token OAuth sem precisar de browser neste PC.

Passo a passo:
  1. Rode este script: python scripts/gerar_token_manual.py
  2. Copie a URL exibida e abra no computador onde você tem acesso ao Google
  3. Faça login e autorize o acesso
  4. O Google vai exibir um código — copie e cole aqui no terminal
  5. O token é salvo em scripts/gmb_token.json

Na próxima vez use apenas: python scripts/fetch_gmb.py
"""

import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    os.system(f"{sys.executable} -m pip install google-auth-oauthlib")
    from google_auth_oauthlib.flow import InstalledAppFlow

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
CLIENT_SECRET = os.path.join(BASE_DIR, "client_secret.json")
TOKEN_FILE    = os.path.join(BASE_DIR, "gmb_token.json")
SCOPES        = ["https://www.googleapis.com/auth/business.manage"]

if not os.path.exists(CLIENT_SECRET):
    print(f"[ERRO] Arquivo não encontrado: {CLIENT_SECRET}")
    sys.exit(1)

flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET, SCOPES)
flow.redirect_uri = "urn:ietf:wg:oauth:2.0:oob"  # modo manual sem localhost

auth_url, _ = flow.authorization_url(
    access_type="offline",
    include_granted_scopes="true",
    prompt="consent"
)

print("\n" + "="*60)
print("PASSO 1 — Abra esta URL no outro computador:")
print("="*60)
print(f"\n{auth_url}\n")
print("="*60)
print("PASSO 2 — Após autorizar, o Google exibe um código.")
print("          Cole o código abaixo e pressione Enter.")
print("="*60 + "\n")

code = input("Cole o código aqui: ").strip()

try:
    flow.fetch_token(code=code)
    creds = flow.credentials
    with open(TOKEN_FILE, "w") as f:
        f.write(creds.to_json())
    print(f"\n[OK] Token salvo em: {TOKEN_FILE}")
    print("     Agora rode: python scripts/fetch_gmb.py")
except Exception as e:
    print(f"\n[ERRO] Falha ao trocar o código: {e}")
    print("       Tente novamente — o código expira em poucos minutos.")
