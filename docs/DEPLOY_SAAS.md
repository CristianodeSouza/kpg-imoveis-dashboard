# Deploy do Portal SaaS CSR

## Dominio

Configure na Vercel:

```txt
saas.csrtecnologia.com.br
```

Depois ajuste:

```env
NEXT_PUBLIC_APP_URL=https://saas.csrtecnologia.com.br
```

## Variaveis obrigatorias

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SETTINGS_ENCRYPTION_KEY=...
SESSION_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=https://bdxmgfhoxileqpjwhqwy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
META_GRAPH_VERSION=v25.0
```

## Variaveis opcionais/fallback

```env
SIGA_TOKEN=
SIGA_ENDPOINT=
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_ACCOUNT_ID=
META_APP_ID=
META_APP_SECRET=
IMGBB_API_KEY=
WHATSAPP_CTA=
BACKEND_URL=
NEXT_PUBLIC_BACKEND_URL=
LEADS_WEBHOOK_SECRET=
KV_REST_API_URL=
KV_REST_API_TOKEN=
MAKE_API_TOKEN=
MAKE_API_BASE_URL=
MAKE_DATA_STORE_ID=
DEFAULT_ADMIN_USERNAME=
DEFAULT_ADMIN_PASSWORD=
```

## Comandos de validacao

```bash
npm run typecheck
npm run build
npx prisma db push
```

## Smoke test de producao

1. Abrir `https://saas.csrtecnologia.com.br/login`.
2. Entrar com admin CSR.
3. Confirmar redirecionamento para `/portal`.
4. Abrir `/admin`.
5. Criar um cliente de teste.
6. Entrar com o usuario do cliente.
7. Confirmar que o portal mostra apenas os servicos contratados.
8. Abrir `/app/configuracoes` e salvar dados sem expor tokens.
9. Confirmar que tenant sem servico nao acessa API protegida.

## Seguranca

- Rotacione a senha do banco antes do deploy final, pois ela foi compartilhada durante a configuracao.
- Use valores fortes e diferentes para `SETTINGS_ENCRYPTION_KEY` e `SESSION_SECRET`.
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Tokens SIGA, Meta, Instagram e Make devem entrar pela tela de configuracoes do cliente.
