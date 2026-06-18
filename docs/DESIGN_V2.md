# Design System v2 - CSR Tecnologia SaaS

Este documento define a camada visual v2 do SaaS CSR. A v2 existe para modernizar o produto com mais densidade, menos ruido visual e componentes consistentes, sem trocar a stack nem quebrar as telas em producao.

## Decisao Tecnica

- A v2 usa CSS puro.
- O arquivo principal e `app/styles/design-system-v2.css`.
- O CSS e importado em `app/globals.css`.
- Todas as classes novas devem usar prefixo `v2-` ou ficar escopadas dentro de `.v2-page`.
- Nao importar CSS global diretamente dentro de `page.tsx`.
- Nao usar `class`; em React sempre usar `className`.
- Nao mexer em backend, Prisma, Supabase, Vercel ou tokens durante tarefas de DS.

## Estrategia de Migracao

Migracao incremental por pagina:

1. Adicionar wrapper `v2-page` na pagina escolhida.
2. Ajustar apenas a camada visual dessa pagina.
3. Validar `npm run typecheck`.
4. Validar `npm run build`.
5. Revisar visual desktop e mobile.
6. So depois repetir em outra pagina.

Primeira pagina piloto: `app/app/blog/page.tsx`.

## Principios

- SaaS operacional, nao landing page.
- Mais dados uteis acima da dobra.
- Tipografia menor e clara.
- Botoes, inputs e cards mais compactos.
- Bordas e superficie antes de sombras fortes.
- Estados semanticamente claros: sucesso, alerta, erro e informativo.
- Cards com raio maximo de 8px.
- Sem cards dentro de cards quando houver alternativa.

## Tokens v2

Tokens ficam em `:root`:

- Cores base: `--v2-bg`, `--v2-surface`, `--v2-surface-soft`.
- Texto: `--v2-text`, `--v2-text-soft`, `--v2-text-muted`.
- Bordas: `--v2-border`, `--v2-border-strong`.
- Acao primaria: `--v2-primary`, `--v2-primary-strong`, `--v2-primary-soft`.
- Estados: `--v2-success`, `--v2-warning`, `--v2-danger` e surfaces correspondentes.
- Raios: `--v2-radius-xs`, `--v2-radius-sm`, `--v2-radius-md`.
- Sombra: `--v2-shadow-xs`, `--v2-shadow-sm`.
- Foco: `--v2-focus`.

## Padroes de Densidade

- Texto base: 13px.
- Labels e eyebrows: 10px a 11px.
- Titulos de pagina: 20px a 22px.
- Botoes: altura de 32px.
- Inputs: altura de 32px.
- Metric cards: 64px a 72px de altura.
- Gaps padrao: 8px a 12px.
- Paineis internos: padding de 12px.

## Componentes

Continuar usando `app/components/ds.tsx` como camada React principal:

- `AppShell`
- `PageHeader`
- `MetricCard`
- `StatusBadge`
- `EmptyState`
- `LoadingState`
- `DataTable`

Quando uma pagina estiver dentro de `.v2-page`, estes componentes recebem refinamento visual automaticamente via CSS escopado.

## O Que Fazer em Novas Telas

- Usar `AppShell` para area autenticada.
- Usar `PageHeader` no topo.
- Usar `MetricCard` para indicadores.
- Usar `DataTable` para historicos, pagamentos, publicacoes e listas administrativas.
- Usar `StatusBadge` para estados curtos.
- Usar `EmptyState` para ausencia de dados.
- Criar CSS novo somente se o padrao existente nao resolver.

## O Que Evitar

- Classes genericas novas como `.card`, `.btn`, `.grid` sem prefixo.
- CSS inline para layout permanente.
- Migrar muitas paginas no mesmo commit.
- Ativar dark mode na v2 sem uma rodada propria de QA.
- Misturar melhoria visual com mudanca de API ou banco.

## Checklist Antes de Commit

```powershell
npm run typecheck
npm run build
git diff --stat
```

Se a mudanca for so visual, o diff nao deve incluir:

- `prisma/schema.prisma`
- `lib/settings.ts`
- `lib/kpg-api.ts`
- rotas de API
- arquivos `.env`

