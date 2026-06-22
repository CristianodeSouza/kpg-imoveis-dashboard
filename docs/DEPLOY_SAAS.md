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
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
SETTINGS_ENCRYPTION_KEY=...
SETTINGS_ENCRYPTION_KEY_PREVIOUS=
SETTINGS_ENCRYPTION_KEY_VERSION=1
SESSION_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=https://bdxmgfhoxileqpjwhqwy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ASSETS_BUCKET=tenant-assets
JOBS_RUN_SECRET=...
CRON_SECRET=...
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
- Token individual de webhook de leads, gerado na ficha do cliente.

## Fila e jobs

`vercel.json` agenda `/api/jobs/run` diariamente porque a conta Hobby da Vercel bloqueia cron mais frequente. Para operacao real com 200 clientes, use Vercel Pro com cron a cada minuto ou um scheduler externo chamando `/api/jobs/run?limit=5` com `Authorization: Bearer <CRON_SECRET>`. Publicacao Instagram e analise de sitemap sao criadas como jobs pendentes e processadas fora da requisicao do usuario, com retry automatico e historico em `JobAttempt`.

## Storage de assets

Storage final definido: Supabase Storage, bucket `tenant-assets` ou valor de `SUPABASE_ASSETS_BUCKET`. O backend grava assets em `Asset` com `tenantId`, `jobId`, `sourceUrl`, `storagePath`, `mimeType` e `sizeBytes`. Enquanto `SUPABASE_SERVICE_ROLE_KEY` nao estiver configurada, o sistema usa fallback ImgBB somente para nao interromper operacao.

## Banco e conexoes

Use `DATABASE_URL` no Pooler/Supavisor do Supabase na Vercel. Mantenha `DIRECT_URL` apontando para a conexao direta apenas para migrations/db push. Se o volume de jobs subir e o pooler ainda saturar, avaliar Prisma Accelerate como camada adicional de pooling/cache.

Status verificado em 2026-06-22: o `.env` local ainda aponta `DATABASE_URL` para `db.bdxmgfhoxileqpjwhqwy.supabase.co`, ou seja, conexao direta. Antes de operar com 200 clientes, atualize a variavel `DATABASE_URL` da Vercel para o Pooler/Supavisor e mantenha `DIRECT_URL` direto apenas para operacoes de schema.

## RLS e seguranca

O arquivo `docs/RLS_SUPABASE_MULTI_TENANT.sql` foi aplicado para ativar RLS defensivo em tabelas multi-tenant. O backend Prisma usa credencial server-side; acessos diretos por roles publicas ficam isolados por `app.tenant_id`.

Roles suportadas: `owner`, `admin`, `operator`, `viewer`. Escrita em settings exige `settings:write`, CRM exige `leads:write` e conteudo exige `content:write`.

Rotacao de `SETTINGS_ENCRYPTION_KEY`: defina uma nova chave em `SETTINGS_ENCRYPTION_KEY`, mantenha a anterior em `SETTINGS_ENCRYPTION_KEY_PREVIOUS`, incremente `SETTINGS_ENCRYPTION_KEY_VERSION` e salve novamente as configuracoes dos clientes para recriptografar.

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
