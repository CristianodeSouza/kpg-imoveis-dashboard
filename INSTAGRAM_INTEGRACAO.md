# Integração Facebook / Instagram Graph API — KPG Imóveis

## Status: FUNCIONANDO (validado em 30/04/2026)

---

## Credenciais configuradas

| Variável | Valor | Arquivo |
|---|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | **System User Token — não expira** | `.env` |
| `INSTAGRAM_ACCOUNT_ID` | `17841408846946904` | `.env` |
| `FACEBOOK_AD_ACCOUNT_ID` | `609918289087466` | `.env` |
| `FACEBOOK_PAGE_ID` | `2169023206718509` | `.env` |

### Tipo do token atual
- **Tipo:** `SYSTEM_USER` — token de Sistema permanente
- **App:** KPG APP CSRTECNOLOGIA (`app_id: 1714953583011773`)
- **expires_at:** `0` — não expira
- **data_access_expires_at:** `0` — não expira
- **Não precisa renovar** — ao contrário de User Tokens que expiram em 60 dias

> Detalhes completos em `data/facebook_info.json`

---

## Contas vinculadas ao token

| Tipo | Nome | ID |
|---|---|---|
| Usuário Meta | Ana Paula Guedes | `26637548292564443` |
| Página Facebook | KPG Imóveis | `2169023206718509` |
| Instagram Business | @kpgimoveis | `17841408846946904` |
| Conta de Anúncios ativa | Ana Paula Guedes | `act_609918289087466` |
| Conta de Anúncios | KPG Principal Anúncios | `act_1166338130546185` |

---

## Permissões do token

Permissões concedidas (verificadas em 30/04/2026):

- `instagram_basic` — leitura de perfil
- `instagram_content_publish` — publicar posts, stories, reels
- `instagram_manage_comments` — gerenciar comentários
- `instagram_manage_insights` — métricas e insights
- `instagram_manage_messages` — mensagens diretas
- `ads_management` — criar e gerenciar campanhas
- `ads_read` — leitura de dados de anúncios
- `pages_manage_posts` — publicar na página Facebook
- `pages_read_engagement` — engajamento da página

---

## Como publicar uma imagem no feed

```python
import urllib.request, json, urllib.parse

TOKEN = "..."          # INSTAGRAM_ACCESS_TOKEN do .env
IG_ID = "17841408846946904"  # INSTAGRAM_ACCOUNT_ID do .env

# Passo 1: criar container de mídia
# A imagem deve ser uma URL HTTPS pública (sem redirect)
data = urllib.parse.urlencode({
    "image_url": "https://sua-url-publica.com/imagem.jpg",
    "caption": "Legenda do post\n\n#hashtag",
    "access_token": TOKEN,
}).encode()

req = urllib.request.Request(
    f"https://graph.facebook.com/v19.0/{IG_ID}/media",
    data=data, method="POST"
)
with urllib.request.urlopen(req, timeout=30) as r:
    container_id = json.loads(r.read())["id"]

# Passo 2: publicar o container
data2 = urllib.parse.urlencode({
    "creation_id": container_id,
    "access_token": TOKEN,
}).encode()

req2 = urllib.request.Request(
    f"https://graph.facebook.com/v19.0/{IG_ID}/media_publish",
    data=data2, method="POST"
)
with urllib.request.urlopen(req2, timeout=30) as r2:
    post_id = json.loads(r2.read())["id"]

print("Publicado! ID:", post_id)
```

---

## Como deletar um post

```python
import urllib.request, json

TOKEN = "..."
POST_ID = "id_do_post"

req = urllib.request.Request(
    f"https://graph.facebook.com/v19.0/{POST_ID}?access_token={TOKEN}",
    method="DELETE"
)
with urllib.request.urlopen(req, timeout=15) as r:
    resp = json.loads(r.read())
# resp = {"success": True, "deleted_id": "..."}
```

---

## Usando o InstagramPublisher (backend/agents/instagram_publisher.py)

A classe `InstagramPublisher` faz o fluxo completo. Ela depende de:

1. `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_ACCOUNT_ID` configurados no `.env`
2. `IMGBB_API_KEY` configurado no `.env` — usado para hospedar imagens locais antes de publicar

```python
from backend.agents.instagram_publisher import InstagramPublisher

publisher = InstagramPublisher()

# Post com imagem local (precisa de IMGBB_API_KEY)
publisher.publicar_carrossel(["caminho/imagem.jpg"], "Legenda aqui")

# Stories
publisher.publicar_stories("caminho/stories.jpg")

# Reels (vídeo)
publisher.publicar_reels("https://url-do-video.mp4", "Legenda")
```

> Para imagens locais sem ImgBB: hospedar manualmente em qualquer serviço público (S3, Cloudinary, etc.) e passar a URL diretamente.

---

## Importante: URL de imagem

O Instagram Graph API exige:

- URL HTTPS pública e acessível pela internet
- Sem redirects (resolver o redirect antes de passar)
- Formato: JPG/JPEG
- Tamanho mínimo: 320x320 px
- Proporção: entre 4:5 e 1.91:1 (recomendado: 1:1 = 1080x1080)

**Para imagens locais:** configurar `IMGBB_API_KEY` no `.env` (cadastro gratuito em imgbb.com).

---

## Verificar validade do token

```python
import urllib.request, json

TOKEN = "..."
url = f"https://graph.facebook.com/v19.0/me?fields=id,name&access_token={TOKEN}"
with urllib.request.urlopen(url, timeout=10) as r:
    print(json.loads(r.read()))
```

O token atual é um **User Token** (pode expirar). Verificar expiração em:
`https://developers.facebook.com/tools/debug/accesstoken/`

Para tokens de longa duração, converter para **System User Token** via Meta Business Suite.

---

## Histórico de testes

| Data | Ação | Resultado |
|---|---|---|
| 30/04/2026 | Validação do token | OK — Ana Paula Guedes |
| 30/04/2026 | Busca de perfil @kpgimoveis | OK — 7.511 seguidores, 593 posts |
| 30/04/2026 | Publicação de imagem no feed | OK — post publicado e deletado com sucesso |
