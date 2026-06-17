# Design System CSR SaaS

Este documento define os padroes visuais e de interface do SaaS da CSR Tecnologia. Novas funcionalidades devem seguir estes componentes e classes antes de criar CSS novo.

## Principios

- O produto e um SaaS operacional, nao uma landing page.
- Priorize leitura, gestao recorrente e comparacao rapida de dados.
- Cards devem ser usados para itens repetidos, modulos, metricas e paineis claros.
- Evite textos explicativos longos dentro da interface. A tela deve mostrar a acao e o estado.
- Configuracoes, pagamentos e conta nao devem aparecer como produtos contratados.
- Dados de cliente sempre devem respeitar `tenantId`.

## Stack visual

- React/Next.js com componentes internos em `app/components/ds.tsx`.
- CSS global em `app/globals.css`.
- Icones com `lucide-react`.
- Inspiracao de arquitetura: shadcn/ui, Radix UI, TanStack Table e dashboards SaaS B2B.
- Nao instalar template pesado sem decisao explicita.

## Tokens

Tokens principais ficam em `:root` no `app/globals.css`:

- Cores: `--ink`, `--gold`, `--green`, `--blue`, `--cyan`, `--amber`, `--red`.
- Superficies: `--paper`, `--panel`, `--line`.
- Texto auxiliar: `--muted`.
- Sombra: `--shadow`, `--shadow-soft`.
- Raio: `--radius`, `--radius-sm`.
- Espacamento: `--space-1` ate `--space-6`.

Regra: use tokens existentes antes de criar novas cores ou espacamentos.

## Componentes Padrao

Arquivo: `app/components/ds.tsx`.

### AppShell

Use em telas autenticadas principais.

Responsabilidades:

- Sidebar lateral.
- Marca CSR.
- Navegacao principal.
- Area secundaria com status ou dados do cliente.
- Logout padronizado.

Exemplo:

```tsx
<AppShell
  subtitle="Portal SaaS"
  navItems={[
    { href: "/portal", label: "Portal", active: true },
    { href: "/app/instagram", label: "Instagram Publisher" }
  ]}
>
  {children}
</AppShell>
```

### PageHeader

Use no topo de paginas internas.

Campos:

- `eyebrow`: contexto curto.
- `title`: nome da pagina.
- `description`: frase objetiva.
- `actions`: botoes de acao, como atualizar ou salvar.

### MetricCard

Use para KPIs e indicadores.

Tons:

- `neutral`: informacao comum.
- `success`: estado bom.
- `warning`: atencao.
- `danger`: problema.
- `info`: informativo.

### StatusBadge

Use para status curtos:

- `success`: ativo, conectado, pago.
- `warning`: pendente, atencao.
- `danger`: erro, bloqueado, atrasado.
- `neutral`: informacao neutra.
- `info`: detalhe operacional.

### DataTable

Use para historicos e listas tabulares:

- clientes
- pagamentos
- publicacoes
- logs
- servicos

Regra: se a tela listar objetos administrativos, prefira `DataTable` em vez de uma sequencia solta de `div`.

### EmptyState e LoadingState

Use para estados sem dados e carregamento.

Nao deixe paineis vazios sem mensagem.

## Layouts

### Portal do cliente

Padrao:

- `AppShell`
- `PageHeader`
- cards de produtos contratados
- acoes de conta no topo: pagamentos e configuracoes

Produtos sao servicos contratados. Pagamentos e configuracoes sao acoes de conta.

### Admin SaaS

Padrao:

- `AppShell`
- `PageHeader`
- tabs internas: Dados gerais, Clientes, Financeiro, Gestao
- `MetricCard` para KPIs
- `DataTable` para listas
- ficha individual do cliente para edicao pesada

### Pagamentos

Padrao:

- resumo com `MetricCard`
- historico com `DataTable`
- comprovantes como links externos
- status com `StatusBadge`

## Formularios

Use:

- `field`
- `input`
- `select`
- `settings-grid`
- `settings-section`

Campos obrigatorios usam `required-mark`.

Dados sensiveis:

- nunca retornar token aberto para o front
- exibir apenas status `Token salvo`, `Secret salvo` ou `Configurado`
- salvar credenciais criptografadas no servidor

## Multi-Tenant

Toda nova funcionalidade deve obedecer:

- buscar sessao do usuario
- identificar `tenantId`
- ler dados no banco por `tenantId`
- nunca usar variavel de ambiente para credencial de cliente

Vercel guarda variaveis globais da plataforma.
Supabase guarda dados e credenciais de clientes.

## O Que Evitar

- Criar novas cores soltas no CSS.
- Criar cards dentro de cards.
- Misturar produto contratado com configuracao de conta.
- Criar tabelas como listas improvisadas.
- Usar variaveis globais de cliente.
- Usar fallback fixo KPG em rota multi-tenant.
- Colocar textos de ajuda longos na interface.

## Checklist Para Nova Tela

- Usa `AppShell` quando autenticada?
- Tem `PageHeader`?
- Usa `MetricCard` para KPIs?
- Usa `DataTable` para listas?
- Usa `StatusBadge` para estados?
- Tem `EmptyState` quando nao ha dados?
- Respeita `tenantId`?
- Nao cria credenciais por cliente na Vercel?

