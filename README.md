# KPG Imóveis — Dashboard & Instagram Publisher

Dashboard executivo para a **KPG Imóveis** com analytics de redes sociais e publicação automatizada no Instagram.

**URL em produção:** https://csrtecnologia.com.br/kpg

---

## Funcionalidades

### 📊 Analytics
- Perfil Instagram ao vivo (seguidores, posts, bio, avatar)
- Grid com últimas 12 publicações (curtidas, comentários, tipo)
- KPIs: total de curtidas, comentários, engajamento médio, melhor post
- Lista de posts agendados

### 📸 Publicar no Instagram
- Busca de imóvel pelo código SIGA CRM
- Grid de fotos com drag & drop para reordenar
- Geração automática de legenda com hashtags
- Publicação imediata com redimensionamento 1:1 (blur-fill)
- Agendamento de posts com data/hora
- Cancelamento de agendamentos

---

## Arquitetura

```
app.py                        ← Flask (porta 5000) — entry point
kpg_publisher/
  __init__.py                 ← Blueprint Flask em /kpg
  scheduler.py                ← APScheduler + SQLite para agendamentos
templates/
  kpg_publisher.html          ← Dashboard unificado (Analytics + Publisher)
  login_v2.html               ← Tela de login
scripts/
  fetch_gmb.py                ← Busca dados Google Meu Negócio
  gerar_token_manual.py       ← Gera OAuth token GMB sem browser local
backend/                      ← FastAPI (porta 8000) — publisher alternativo
data/                         ← JSONs de cache (ignorado pelo Git)
```

---

## Endpoints principais (`/kpg`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/kpg/` | Dashboard principal |
| POST | `/kpg/api/preview` | Busca imóvel no SIGA CRM |
| POST | `/kpg/api/publicar` | Publica no Instagram |
| POST | `/kpg/api/agendar` | Agenda publicação |
| GET | `/kpg/api/agendados` | Lista agendamentos |
| DELETE | `/kpg/api/agendados/<id>` | Cancela agendamento |
| GET | `/kpg/api/token/status` | Verifica token Meta |
| GET | `/kpg/api/instagram/perfil` | Perfil Instagram ao vivo |
| GET | `/kpg/api/instagram/posts` | Últimas 12 publicações |

---

## Configuração local

### 1. Instalar dependências
```bash
pip install -r requirements.txt
```

### 2. Criar arquivo `.env` na raiz
```env
SIGA_TOKEN=seu_token_siga
INSTAGRAM_ACCESS_TOKEN=seu_token_meta
INSTAGRAM_ACCOUNT_ID=id_da_conta_instagram
FACEBOOK_PAGE_ID=id_da_pagina_facebook
FACEBOOK_AD_ACCOUNT_ID=id_conta_anuncios
IMGBB_API_KEY=sua_chave_imgbb        # opcional
ANTHROPIC_API_KEY=sua_chave_claude   # opcional
```

### 3. Iniciar servidor
```bash
python app.py
# Acesse: http://localhost:5000/kpg
# Senha padrão: kpg2026
```

---

## Deploy (Render + Cloudflare)

| Componente | Serviço |
|------------|---------|
| Servidor Python | Render.com (Web Service) |
| DNS + SSL | Cloudflare (modo Flexível) |
| CI/CD | Auto-deploy a cada push no `main` |

**Start command no Render:** `gunicorn app:app`

**Variáveis de ambiente:** configuradas no painel do Render → Environment.

---

## Integrações

### Meta / Instagram Graph API
- Versão: v19.0
- Token: System User (não expira)
- Permissões: `instagram_content_publish`, `ads_management`, `pages_read_engagement`
- Conta: @kpgimoveis (Instagram Business)
- Instagram Business Account ID: `17841408846946904`

### SIGA CRM
- Acesso via proxy: `https://www.kpgimoveis.com.br/api/imovel/{codigo}`
- Headers: User-Agent de navegador + Referer do site KPG

### Google Meu Negócio
- OAuth 2.0 com refresh token
- Token salvo em `scripts/gmb_token.json` (não versionado)
- Projeto Google Cloud: `firm-modem-494317-e1`
- Status: quota da API `mybusinessaccountmanagement` precisa ser aumentada no Google Cloud Console

---

## Controle de Versão

A versão atual é exibida no **rodapé do dashboard** com três informações:

| Campo | Descrição |
|-------|-----------|
| `v1.x.x` | Número da versão semântica |
| Descrição | O que mudou neste release |
| Servidor iniciado | Data/hora exata em que o processo subiu no Render |

Para atualizar a versão em um novo release, edite as duas linhas em `app.py`:

```python
APP_VERSION      = "1.3.0"
APP_VERSION_DATE = "15/05/2026 — Descrição da nova funcionalidade"
```

### Histórico de versões

| Versão | Data | Descrição |
|--------|------|-----------|
| v1.0.0 | 25/04/2026 | Setup inicial — Flask + GMB Dashboard |
| v1.1.0 | 30/04/2026 | KPG Publisher — publicação no Instagram |
| v1.2.0 | 01/05/2026 | Dashboard unificado Analytics + Publisher |

---

## Observações

- **CREDENCIAIS.md** — arquivo local com todos os tokens/IDs reais (não versionado pelo `.gitignore`)
- **ImgBB** — necessário apenas para redimensionamento de fotos. Sem ele, publica direto pelas URLs do CDN SIGA
- **Render Free** — servidor "dorme" após 15 min sem uso; primeira visita pode levar ~30s

---

© 2026 KPG Imóveis · Desenvolvido por CSR Tecnologia
