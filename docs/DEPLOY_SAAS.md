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
DEFAULT_ADMIN_PASSWORD=...
PLATFORM_ADMIN_PASSWORD=...
```

## Variaveis opcionais da plataforma

```env
META_APP_ID=
META_APP_SECRET=
IMGBB_API_KEY=
WHATSAPP_CTA=
BACKEND_URL=
NEXT_PUBLIC_BACKEND_URL=
LEADS_WEBHOOK_SECRET=
MAKE_API_BASE_URL=
DEFAULT_ADMIN_USERNAME=
PLATFORM_ADMIN_USERNAME=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Credenciais por cliente

Nao configure no Vercel credenciais individuais de clientes. Com muitos clientes, esses dados devem ficar no Supabase, vinculados ao `tenantId`, principalmente em `TenantSettings`.

Configure pela tela do cliente ou pelo painel admin:

- token SIGA;
- slug/endpoint SIGA;
- Instagram Account ID;
- Instagram Access Token;
- Make API Token;
- Make Data Store ID;
- Google Business Account ID;
- Google Business Location ID;
- Google Refresh Token;
- WhatsApp do cliente.

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
- Tokens SIGA, Instagram, Make e Google Business devem entrar pela tela de configuracoes do cliente.
- Nunca use variaveis Vercel para separar credenciais de 200 clientes.
