# Plano de execucao: CRM alimentado pela planilha Google Sheets

## Objetivo

Alterar a fonte de novas conversas do CRM do tenant **KPG Imoveis** para a aba `atendimento` da planilha Google Sheets informada, preservando integralmente o historico ja gravado no Supabase.

O Make continuara disponivel para os demais tenants ate que exista uma decisao comercial e tecnica para migracao deles. A planilha nao sera uma fonte global do SaaS.

Planilha de origem:

`1UZSiw6pJGa36bvFT1RfUHFHiFrJYkyXH6JZ2JjFHs9o`, aba `atendimento`.

## Regras de negocio

- Tenant autorizado: KPG Imoveis, identificado pelo `tenantId` real do banco e por uma configuracao explicita de fonte.
- Fonte de novas conversas do KPG: Google Sheets / aba `atendimento`.
- Historico antigo: permanece nas tabelas `Lead` e `LeadInteraction`; nenhuma rotina de exclusao sera criada.
- Outros tenants: continuam usando a fonte atual, sem acesso a dados da planilha do KPG.
- Reprocessamento: ler a planilha varias vezes nao pode criar mensagens ou interacoes duplicadas.
- Falha parcial: uma linha invalida nao pode interromper a importacao das demais; o erro deve ser registrado para diagnostico.
- Seguranca: o identificador da planilha e o nome da aba devem ficar em configuracao do tenant ou em variavel server-side, nunca em dado controlado pelo navegador.

## Estado atual relevante

- O frontend chama `POST /api/leads/sync-make`.
- A rota atual busca dados via Make e chama `upsertLeads(payloads, session.tenantId)`.
- A persistencia e multi-tenant porque `Lead` e `LeadInteraction` possuem `tenantId`.
- A identificacao do lead usa telefone, `chatLid` ou `conversationId`.
- Cada sincronizacao atualmente cria uma nova `LeadInteraction`, portanto a idempotencia precisa ser implementada antes da ativacao da nova fonte.

Inventario inicial verificado em 17/08/2026 no banco local conectado ao ambiente do projeto:

- `csr-tecnologia`: 0 leads, 0 interacoes.
- `kpg` / KPG Imoveis: 0 leads, 0 interacoes.
- `cliente-02-instagram`: 0 leads, 0 interacoes.

Esse inventario e uma fotografia tecnica do ambiente consultado. Antes da importacao em producao, a contagem do banco de producao deve ser registrada novamente e comparada com o backup.

## Etapa 0 - Inventario, backup e congelamento da regra atual

### Entregas

- Confirmacao do `tenantId` e slug do KPG Imoveis no banco.
- Contagem e exportacao de seguranca de `Lead` e `LeadInteraction` do KPG.
- Registro da fonte atual do tenant e da data/hora de corte.
- Lista de campos existentes na aba `atendimento`.

### Requisitos

- Acesso de leitura ao Supabase.
- Acesso de leitura a planilha.
- Backup armazenado fora da rotina de importacao e identificado por data.

### Criterios de aceite

- O backup pode ser reimportado em ambiente de teste.
- O total de leads e interacoes antes da mudanca esta documentado.
- Nenhum dado de outro tenant aparece no inventario do KPG.
- Existe uma data de corte registrada para distinguir historico antigo de novas importacoes.

## Etapa 1 - Contrato e validacao da planilha

### Entregas

- Leitor server-side da aba `atendimento`.
- Parser de CSV/Google Visualization que suporte campos entre aspas, virgulas e quebras de linha.
- Mapeamento documentado:

| Planilha | CRM |
|---|---|
| `Nome` | `Lead.name` |
| `Numero Whatsapp` | `Lead.phone` |
| `Data da 1 Conversa` | `Lead.createdAt` / `Lead.lastMessageAt` |
| `Conversas` | `Lead.message`, `Lead.originalMessage`, `LeadInteraction.message` |
| `chatLid` | `Lead.chatLid` |
| `Status` | `Lead.status` |
| `Status do Corretor` / `Encaminhamento` | `Lead.stage` e inferencia de status |
| `FromME` / `FromAPI` | `LeadInteraction.direction` |

- Normalizacao de telefone, booleanos, status e data no formato `HH:mm - DD/MM/YYYY`.

### Requisitos

- A aba precisa manter cabecalhos estaveis ou possuir uma camada de aliases.
- Linhas sem telefone devem ser aceitas somente se tiverem `chatLid` ou outro identificador valido.
- O texto integral da conversa deve ser preservado no campo bruto, sem depender apenas do texto limpo exibido.

### Criterios de aceite

- O leitor retorna quantidade de linhas, cabecalhos e erros de validacao sem gravar nada.
- Uma amostra real da aba e convertida corretamente para o contrato interno de lead.
- Datas e direcoes de mensagem sao interpretadas corretamente.
- Colunas novas ou vazias nao causam erro fatal.

## Etapa 2 - Configuracao isolada por tenant

### Entregas

- Configuracao de fonte por tenant, por exemplo `MAKE` ou `GOOGLE_SHEETS`.
- Campos server-side para `spreadsheetId`, `sheetName` e, se necessario, modo de acesso.
- Regra que habilita `GOOGLE_SHEETS` somente para o tenant KPG Imoveis.
- Rota de sincronizacao renomeada para uma interface neutra, mantendo compatibilidade temporaria com `/api/leads/sync-make`.

### Requisitos

- A decisao da fonte deve vir do banco/configuracao protegida, nunca de um parametro enviado pelo frontend.
- A rota deve sempre usar `session.tenantId` e validar permissao do servico CRM.
- A planilha do KPG nao pode ser configurada como default global.

### Criterios de aceite

- KPG usa a planilha ao sincronizar.
- Um tenant diferente continua usando Make e nao consegue requisitar a planilha do KPG.
- Alterar um parametro no navegador nao muda o tenant ou a planilha consumida.
- Logs server-side identificam `tenantId`, fonte e resultado sem registrar tokens ou conteudo sensivel.

## Etapa 3 - Idempotencia e preservacao do historico

### Entregas

- Identificador estavel por registro da planilha, formado por uma combinacao de planilha, aba, linha/identificador da conversa e conteudo ou timestamp.
- Campos de origem e `externalId` em `LeadInteraction`, com indice/unicidade por tenant quando aplicavel.
- Persistencia que atualiza o lead sem incrementar interacoes quando o registro ja foi importado.
- Nenhuma operacao `deleteMany`, limpeza ou substituicao do historico.

### Requisitos

- O identificador deve ser deterministico entre execucoes.
- O tenant deve participar da chave de idempotencia.
- O processamento de registros legados sem `externalId` deve continuar funcionando.

### Criterios de aceite

- Executar a mesma sincronizacao duas vezes gera zero novas interacoes na segunda execucao.
- Uma nova mensagem/conversa gera uma nova interacao ligada ao lead correto.
- O total de interacoes anterior a migracao permanece igual, salvo novas mensagens validas.
- Dois tenants com o mesmo telefone nao compartilham lead nem interacao.

## Etapa 4 - Importacao inicial controlada

### Entregas

- Modo de simulacao/dry-run com contagem de novos, atualizados, ignorados e invalidos.
- Importacao inicial da aba `atendimento` somente para KPG.
- Relatorio da importacao com totais, linhas rejeitadas e motivo.
- Marcacao da fonte como `Google Sheets - atendimento` nos novos registros.

### Requisitos

- Backup da Etapa 0 concluido.
- Idempotencia da Etapa 3 aprovada em teste.
- Importacao limitada por lote para evitar timeout.

### Criterios de aceite

- Dry-run nao altera o banco.
- A importacao concluida nao apaga nem substitui o historico antigo.
- Cada linha valida fica associada ao tenant KPG.
- O relatorio permite localizar cada linha invalida sem expor credenciais.

## Etapa 5 - Sincronizacao incremental e operacao

### Entregas

- Botao/acao `Sincronizar conversas` no CRM com retorno claro de sucesso, parcial ou falha.
- Endpoint protegido e preparado para pagina/lote.
- Registro de ultima sincronizacao, quantidade lida, importada, ignorada e falha.
- Job assincro nico se a leitura da planilha exceder o tempo seguro de uma requisicao web.
- Retry com limite e backoff para falhas transitórias do Google Sheets.

### Requisitos

- A sincronizacao precisa ser segura para repeticao.
- Timeout, rate limit e indisponibilidade da planilha devem produzir estado recuperavel.
- O frontend nao pode depender de resposta longa para manter o CRM utilizavel.

### Criterios de aceite

- O CRM continua respondendo mesmo com a planilha indisponivel.
- Uma falha pode ser repetida sem duplicar historico.
- O usuario ve quantos registros foram processados e quais falharam.
- Com varias execucoes simultaneas, nao ha duplicacao por corrida.

## Etapa 6 - Validacao funcional, seguranca e multi-tenant

### Entregas

- Testes automatizados do parser, mapeamento, idempotencia e autorizacao por tenant.
- Teste manual de KPG com uma conversa real e uma nova linha da planilha.
- Teste com tenant diferente, confirmando isolamento.
- Verificacao de logs, limites e mensagens de erro.

### Requisitos

- Ambiente de homologacao ou janela controlada de producao.
- Usuario com permissao de operador/admin do CRM.
- Evidencias de consultas filtradas por `tenantId`.

### Criterios de aceite

- KPG recebe as conversas novas da aba `atendimento`.
- O historico anterior continua visivel no CRM.
- Nenhum tenant diferente acessa, importa ou recebe dados da planilha.
- Dados invalidos nao derrubam a sincronizacao completa.
- Build, typecheck e testes passam sem erros.

## Etapa 7 - Ativacao e monitoramento pos-producao

### Entregas

- Deploy da alteracao com rollback documentado.
- Primeira sincronizacao monitorada.
- Checklist de 24 horas com totais, erros, duplicidades e tempo de resposta.
- Documentacao operacional para trocar a planilha, aba ou fonte no futuro.

### Requisitos

- Variaveis e configuracoes revisadas na Vercel.
- Prisma/Supabase atualizado antes do deploy quando houver alteracao de schema.
- Backup e plano de rollback disponiveis.

### Criterios de aceite

- O deploy esta saudavel e a rota de CRM responde.
- A primeira sincronizacao em producao conclui sem perda de dados.
- Nao surgem duplicidades no segundo processamento.
- O dashboard/log permite identificar falha de acesso, parser ou banco.
- Rollback restaura a fonte anterior sem apagar o historico.

## Fora de escopo desta alteracao

- Migrar automaticamente outros clientes para a mesma planilha.
- Apagar ou reescrever o historico antigo.
- Permitir que cada usuario escolha qualquer planilha pelo frontend.
- Transformar Google Sheets em banco principal de longo prazo para todo o SaaS.

## Resultado final esperado

O CRM continuara multi-tenant. O KPG Imoveis passara a receber novas conversas da aba `atendimento`, enquanto o historico antigo permanecera no Supabase e os demais clientes continuarao isolados usando suas proprias fontes. A sincronizacao podera ser repetida com seguranca, sem duplicacao e sem depender de uma requisicao web longa.
