# Documentacao do Projeto - SaaS de Blog SEO/GEO para SIGA CRM

**Projeto:** Plataforma SaaS para criacao, analise e publicacao de posts otimizados para SEO e GEO em blogs do SIGA CRM  
**Empresa:** CSR Tecnologia  
**Publico-alvo:** Imobiliarias clientes da SIGA CRM  
**Versao:** 1.0  
**Data:** 2026-06-17  
**Status:** Planejamento de produto e execucao  

---

## 1. Visao Geral

O projeto tem como objetivo transformar a antiga automacao de postagem baseada em coleta de noticias externas em uma plataforma SaaS de criacao inteligente de conteudo para blogs imobiliarios.

A proposta anterior utilizava sites de terceiros como fonte de referencia para gerar postagens. A nova proposta abandona esse modelo e passa a priorizar conteudos autorais, estrategicos e personalizados para cada imobiliaria, usando dados reais da empresa, sua localizacao, seus servicos, seus diferenciais, tipos de imoveis e regioes de atuacao.

O foco principal nao sera quantidade de postagens por dia, mas sim qualidade, indexabilidade, autoridade local e capacidade de ser compreendido, citado e recomendado por mecanismos de busca tradicionais e motores generativos, como Google AI Overviews, ChatGPT, Gemini e Perplexity.

---

## 2. Objetivo do Produto

Criar um SaaS onde a imobiliaria ou a equipe da CSR possa configurar os dados da empresa, gerar posts com apoio de inteligencia artificial, analisar indicadores SEO/GEO, aprovar conteudos e publicar diretamente no Blog SIGA CRM via API.

O produto deve ajudar imobiliarias a:

- melhorar presenca organica no Google;
- criar conteudos relevantes para buscas locais;
- fortalecer autoridade digital da marca;
- gerar posts que respondam perguntas reais de compradores, vendedores e investidores;
- estruturar conteudo para melhor leitura por motores generativos;
- criar URLs, titulos, meta descriptions, tags e textos com intencao estrategica;
- publicar no SIGA CRM sem preencher manualmente o painel;
- manter historico, qualidade e padrao editorial.

---

## 3. Mudanca de Estrategia

### Modelo anterior

- Coletar noticias de sites externos.
- Classificar noticias por palavras-chave.
- Reescrever ou adaptar conteudo.
- Publicar varios posts por dia.
- Usar fonte externa como origem principal.

### Novo modelo

- Criar conteudo autoral.
- Usar dados da propria imobiliaria.
- Gerar posts com intencao SEO/GEO.
- Priorizar qualidade e estrutura.
- Publicar menos, mas melhor.
- Medir qualidade antes da publicacao.
- Criar slugs estrategicos para sitemap e indexacao.
- Usar o Blog SIGA CRM como canal de publicacao.

---

## 4. Conceitos Principais

### SEO

SEO, Search Engine Optimization, e o conjunto de praticas para melhorar a visibilidade de paginas em mecanismos de busca como Google.

No projeto, SEO envolve:

- titulo otimizado;
- slug estrategico;
- meta description;
- estrutura H1, H2 e H3;
- uso adequado de palavras-chave;
- conteudo original;
- links internos;
- tags;
- resposta clara a intencao de busca;
- dados estruturados quando possivel.

### GEO

GEO, Generative Engine Optimization, e a otimizacao para motores generativos. O objetivo e preparar conteudos para serem compreendidos, resumidos, citados ou recomendados por sistemas de inteligencia artificial.

No projeto, GEO envolve:

- respostas diretas;
- clareza semantica;
- perguntas frequentes;
- entidades locais;
- mencao consistente da imobiliaria;
- autoridade sobre cidade, bairros e tipos de imoveis;
- schema e dados estruturados;
- conteudo util, objetivo e confiavel;
- alinhamento entre titulo, slug, H1, meta description e conteudo.

---

## 5. Integracao com SIGA CRM

O Blog SIGA CRM sera o canal de destino das publicacoes.

Endpoint:

```text
POST https://api.sigacrm.com.br/{IMOBILIARIA}/cadastrar/post-blog
```

Exemplo:

```text
POST https://api.sigacrm.com.br/kpg/cadastrar/post-blog
```

Payload oficial:

```json
{
  "idimob": 1,
  "idCategoria": 1,
  "idUsuario": 1,
  "titulo": "Titulo da postagem do blog",
  "url": "titulo-da-postagem",
  "texto": "<p>Texto da postagem</p>",
  "description": "Descricao resumida para SEO",
  "tags": "imoveis, mercado, dicas",
  "fonte": "",
  "status": 0,
  "data": "2026-05-18",
  "mostrarData": 0,
  "video": "",
  "linkExterno": ""
}
```

### Mapeamento de campos

| Campo SIGA | Uso no SaaS |
|---|---|
| `idimob` | ID da imobiliaria no SIGA CRM |
| `idCategoria` | Categoria do blog escolhida ou configurada |
| `idUsuario` | Autor padrao configurado para o cliente |
| `titulo` | Titulo SEO gerado pela ferramenta |
| `url` | Slug estrategico gerado pelo modulo SEO/GEO |
| `texto` | Conteudo HTML do post |
| `description` | Meta description otimizada |
| `tags` | Tags SEO separadas por virgula |
| `fonte` | Vazio para conteudo autoral ou fonte oficial quando houver |
| `status` | 0 para rascunho, 1 para publicado |
| `data` | Data de publicacao em formato `YYYY-MM-DD` |
| `mostrarData` | 0 para ocultar data, 1 para exibir |
| `video` | URL ou codigo de video, opcional |
| `linkExterno` | Link externo relacionado, opcional |

---

## 6. Principio Estrategico dos Slugs

O campo `url` da API SIGA nao deve ser tratado apenas como endereco tecnico. Ele deve ser considerado parte da estrategia de indexacao.

Como o sitemap do site lista as URLs publicadas, o slug influencia a forma como Google e outros motores compreendem o tema da pagina.

### Exemplo ruim

```text
atracoes-imobiliaria-kpg-imoveis-em-gramado-mostra-potencial-investir
```

Problemas:

- parece automatizado;
- repete a marca sem necessidade;
- nao deixa clara a intencao de busca;
- usa termos genericos;
- desperdicca espaco semantico.

### Exemplo melhor

```text
atracoes-de-gramado-valorizam-imoveis-para-investimento
```

### Estrutura recomendada

```text
intencao + tipo/servico + localizacao + beneficio
```

Exemplos:

```text
comprar-apartamento-em-gramado-com-seguranca
investir-em-imoveis-em-gramado-vale-a-pena
melhores-bairros-de-gramado-para-morar
avaliacao-de-imovel-em-gramado-com-imobiliaria
casas-em-condominio-em-gramado-para-familias
```

### Regras do gerador de slug

- usar letras minusculas;
- remover acentos;
- trocar espacos por hifens;
- remover caracteres especiais;
- conter cidade, bairro ou regiao quando fizer sentido;
- conter tipo de imovel, servico ou intencao;
- evitar repeticao excessiva da marca;
- evitar slugs vagos;
- evitar slugs muito curtos;
- manter preferencialmente entre 45 e 85 caracteres;
- validar duplicidade antes da publicacao;
- alinhar slug com titulo, H1 e meta description.

---

## 7. Publico-Alvo

### Usuario final

Imobiliarias que usam SIGA CRM e desejam melhorar a performance do blog sem depender de redatores, agencias ou publicacoes manuais frequentes.

### Usuario administrador

Equipe da CSR Tecnologia, que podera configurar clientes, acompanhar execucoes, validar publicacoes, ajustar parametros e dar suporte.

---

## 8. Modulos do Produto

### 8.1 Cadastro da Imobiliaria

Armazena dados institucionais usados na geracao dos posts.

Campos:

- nome fantasia;
- razao social;
- CRECI;
- endereco completo;
- cidade principal;
- cidades atendidas;
- bairros atendidos;
- telefone;
- WhatsApp;
- e-mail;
- site;
- URL do blog;
- Google Business Profile;
- Instagram;
- descricao institucional;
- diferenciais da empresa;
- publico-alvo;
- tom de voz;
- assinatura padrao para CTA.

### 8.2 Servicos e Produtos

Define o que a imobiliaria oferece.

Opcoes:

- venda de imoveis;
- locacao;
- administracao de imoveis;
- avaliacao de imoveis;
- consultoria para investidores;
- lancamentos;
- terrenos;
- casas;
- apartamentos;
- coberturas;
- imoveis comerciais;
- imoveis de alto padrao;
- aluguel de temporada.

### 8.3 Regioes Estrategicas

Define as entidades locais relevantes para SEO/GEO.

Campos:

- cidades prioritarias;
- bairros prioritarios;
- regioes comerciais;
- pontos turisticos;
- condominios;
- empreendimentos;
- vias importantes;
- termos locais relevantes.

### 8.4 Estrategia de Conteudo

Define os temas e regras editoriais.

Campos:

- palavras-chave principais;
- palavras-chave secundarias;
- perguntas frequentes dos clientes;
- temas prioritarios;
- temas proibidos;
- intencao de busca;
- objetivo do post;
- tamanho desejado;
- modo de publicacao.

Intencoes:

- comprar;
- vender;
- alugar;
- investir;
- morar;
- avaliar;
- financiar;
- escolher;
- comparar;
- entender;
- planejar;
- encontrar.

### 8.5 Gerador de Posts

Responsavel por criar o conteudo.

Saidas geradas:

- titulo SEO;
- slug;
- meta description;
- tags;
- conteudo HTML;
- FAQ;
- CTA;
- sugestoes de links internos;
- sugestoes de link externo quando necessario;
- resumo para redes sociais;
- score SEO;
- score GEO;
- score de slug;
- status editorial.

### 8.6 Motor de Analise SEO/GEO

Analisa a qualidade do post antes da publicacao.

Indicadores SEO:

- titulo com palavra-chave;
- tamanho do titulo;
- palavra-chave no primeiro paragrafo;
- slug estrategico;
- meta description adequada;
- uso de H2/H3;
- legibilidade;
- tags relevantes;
- links internos sugeridos;
- ausencia de repeticao excessiva.

Indicadores GEO:

- resposta direta a uma pergunta;
- estrutura em perguntas e respostas;
- mencao de cidade/bairro;
- entidade da imobiliaria presente;
- contexto local;
- autoridade sobre o tema;
- clareza semantica;
- consistencia entre titulo, slug, H1 e texto;
- FAQ presente;
- dados estruturados quando possivel.

### 8.7 Publicador SIGA CRM

Responsavel por enviar o post para a API SIGA.

Funcoes:

- configurar imobiliaria no endpoint;
- configurar token seguro;
- listar ou cadastrar categorias;
- definir autor padrao;
- montar payload;
- validar limites da API;
- publicar como rascunho;
- publicar diretamente;
- registrar resposta da API;
- tratar erros 400, 401 e falhas de rede.

### 8.8 Historico e Auditoria

Registra tudo que foi criado, editado, aprovado e publicado.

Dados:

- data de criacao;
- usuario responsavel;
- dados usados na geracao;
- versao do prompt/modelo;
- post gerado;
- score SEO/GEO;
- status;
- payload enviado;
- retorno da API;
- data de publicacao;
- erros.

---

## 9. Requisitos Funcionais

### RF01 - Cadastro de clientes

O sistema deve permitir cadastrar imobiliarias clientes da SIGA CRM.

### RF02 - Configuracao SIGA

O sistema deve permitir configurar por cliente:

- identificador da imobiliaria na URL da API;
- `idimob`;
- `idUsuario`;
- `idCategoria`;
- token de autenticacao;
- URL base do site;
- URL do blog.

### RF03 - Cadastro de dados da imobiliaria

O sistema deve permitir preencher dados institucionais, endereco, contato, regioes, servicos e diferenciais da imobiliaria.

### RF04 - Cadastro de regioes e bairros

O sistema deve permitir cadastrar cidades, bairros e regioes prioritarias para serem usadas nos posts.

### RF05 - Cadastro de servicos e tipos de imoveis

O sistema deve permitir configurar os servicos e produtos que a imobiliaria deseja promover.

### RF06 - Geracao de ideias de posts

O sistema deve sugerir ideias de posts com base nos dados da imobiliaria, regioes, servicos e intencoes de busca.

### RF07 - Geracao de post completo

O sistema deve gerar titulo, slug, description, tags e conteudo HTML.

### RF08 - Geracao estrategica de slug

O sistema deve gerar slugs com palavras estrategicas, localizacao e intencao de busca.

### RF09 - Edicao manual

O usuario deve poder editar titulo, slug, description, tags e conteudo antes da publicacao.

### RF10 - Analise SEO/GEO

O sistema deve calcular scores e apontar melhorias antes da publicacao.

### RF11 - Publicacao como rascunho

O sistema deve permitir enviar o post para o SIGA com `status: 0`.

### RF12 - Publicacao direta

O sistema deve permitir enviar o post para o SIGA com `status: 1`, quando autorizado.

### RF13 - Historico de posts

O sistema deve listar posts gerados, aprovados, rejeitados, publicados e com erro.

### RF14 - Controle de duplicidade

O sistema deve impedir slugs duplicados e alertar sobre temas muito parecidos.

### RF15 - Logs de integracao

O sistema deve registrar payload enviado, resposta da API e erro quando houver falha.

### RF16 - Modo de aprovacao

O sistema deve permitir fluxo de aprovacao antes da publicacao.

### RF17 - Configuracao de tom de voz

O sistema deve permitir definir tom de voz por cliente.

### RF18 - Geracao de CTA

O sistema deve gerar chamadas para contato com WhatsApp, telefone ou pagina de imoveis.

### RF19 - Suporte a video e link externo

O sistema deve permitir preencher os campos `video` e `linkExterno`.

### RF20 - Exportacao e consulta

O sistema deve permitir consultar historico, filtrar posts e exportar dados basicos.

---

## 10. Requisitos Nao Funcionais

### RNF01 - Seguranca

Tokens e credenciais nao devem ser salvos em arquivos de documentacao, frontend ou logs abertos.

### RNF02 - Criptografia

Tokens de API devem ser criptografados no banco ou armazenados em secret manager.

### RNF03 - Controle de acesso

Usuarios devem acessar apenas os dados da propria imobiliaria, exceto administradores CSR.

### RNF04 - Auditoria

Alteracoes importantes devem ser registradas com usuario, data e conteudo alterado.

### RNF05 - Disponibilidade

O SaaS deve ser projetado para operar continuamente, com tolerancia a falhas temporarias da API SIGA.

### RNF06 - Escalabilidade

O sistema deve permitir crescimento para multiplas imobiliarias sem criar uma automacao separada por cliente.

### RNF07 - Performance

A geracao e analise de post deve responder em tempo aceitavel para uso interativo.

### RNF08 - Resiliencia

Falhas na API SIGA nao devem causar perda do conteudo gerado.

### RNF09 - Observabilidade

O sistema deve possuir logs, status de integracao e historico de erros.

### RNF10 - Qualidade editorial

O sistema deve evitar conteudos duplicados, superficiais, repetitivos ou com aparencia de automacao em massa.

### RNF11 - Compatibilidade HTML

O conteudo gerado deve usar HTML simples e compativel com o editor do SIGA.

### RNF12 - Conformidade

O sistema deve respeitar privacidade dos dados do cliente e boas praticas de conteudo autoral.

---

## 11. Arquitetura Proposta

### Componentes

1. Frontend SaaS
   - painel de configuracao;
   - criacao de posts;
   - revisao SEO/GEO;
   - historico;
   - publicacao.

2. Backend API
   - autenticacao;
   - clientes;
   - configuracoes;
   - geracao de conteudo;
   - analise SEO/GEO;
   - integracao SIGA;
   - logs.

3. Motor de IA
   - gera temas;
   - gera posts;
   - gera slugs;
   - gera meta descriptions;
   - revisa qualidade.

4. Banco de dados
   - clientes;
   - configuracoes;
   - regioes;
   - posts;
   - scores;
   - logs;
   - auditoria.

5. Worker/Fila
   - tarefas demoradas;
   - geracao de conteudo;
   - publicacao;
   - reprocessamentos.

6. Integracao SIGA
   - envio para API;
   - tratamento de resposta;
   - validacao.

---

## 12. Modelo de Dados Inicial

### Tabela: clientes

Campos sugeridos:

- id;
- nome;
- razao_social;
- creci;
- cidade_principal;
- endereco;
- telefone;
- whatsapp;
- email;
- site_url;
- blog_url;
- google_business_url;
- instagram_url;
- descricao;
- diferenciais;
- status;
- created_at;
- updated_at.

### Tabela: siga_configuracoes

Campos sugeridos:

- id;
- cliente_id;
- imobiliaria_slug_api;
- idimob;
- id_usuario;
- id_categoria_padrao;
- token_api_criptografado;
- publicar_automaticamente;
- mostrar_data_padrao;
- status_padrao;
- created_at;
- updated_at.

### Tabela: regioes

Campos sugeridos:

- id;
- cliente_id;
- tipo;
- nome;
- prioridade;
- observacoes.

### Tabela: servicos

Campos sugeridos:

- id;
- cliente_id;
- nome;
- ativo;
- prioridade.

### Tabela: posts

Campos sugeridos:

- id;
- cliente_id;
- titulo;
- slug;
- description;
- tags;
- texto_html;
- fonte;
- video;
- link_externo;
- status_editorial;
- status_siga;
- seo_score;
- geo_score;
- slug_score;
- payload_siga;
- resposta_siga;
- siga_post_id;
- data_publicacao;
- created_at;
- updated_at.

### Tabela: logs_integracao

Campos sugeridos:

- id;
- cliente_id;
- post_id;
- tipo;
- status;
- request_payload;
- response_body;
- http_status;
- erro;
- created_at.

---

## 13. Fluxo de Uso

### Fluxo administrativo inicial

1. CSR cadastra cliente.
2. CSR informa dados de integracao SIGA.
3. CSR configura dados da imobiliaria.
4. CSR cadastra regioes, servicos e palavras-chave.
5. CSR gera primeiro post de teste.
6. Sistema calcula scores.
7. CSR revisa e aprova.
8. Sistema envia para SIGA como rascunho.
9. CSR valida no painel SIGA.
10. Cliente aprova ativacao.

### Fluxo operacional

1. Usuario escolhe tema ou pede sugestoes.
2. Sistema gera post.
3. Sistema gera slug estrategico.
4. Sistema calcula SEO Score, GEO Score e Slug Score.
5. Usuario ajusta o conteudo se necessario.
6. Usuario aprova.
7. Sistema publica no SIGA.
8. Sistema registra status e retorno.

---

## 14. Plano de Execucao

### Fase 1 - Definicao e prototipo funcional

Objetivo: validar o novo conceito.

Entregas:

- documento de produto;
- modelo inicial de dados;
- tela de cadastro da imobiliaria;
- tela de geracao de post;
- gerador de slug;
- exemplo de payload SIGA;
- envio manual para API como rascunho.

### Fase 2 - MVP interno CSR

Objetivo: permitir que a CSR use o sistema para poucos clientes.

Entregas:

- login administrativo;
- cadastro de clientes;
- configuracao SIGA por cliente;
- cadastro de regioes e servicos;
- gerador de ideias;
- gerador de posts;
- editor de conteudo;
- SEO/GEO Score inicial;
- publicacao no SIGA;
- historico e logs.

### Fase 3 - Fluxo de aprovacao

Objetivo: reduzir risco editorial.

Entregas:

- status: rascunho, em revisao, aprovado, publicado, rejeitado, erro;
- aprovacao antes de publicar;
- comparacao de versoes;
- comentarios internos;
- publicacao direta opcional.

### Fase 4 - Painel do cliente

Objetivo: permitir que a imobiliaria acompanhe e aprove conteudos.

Entregas:

- login do cliente;
- dashboard;
- posts pendentes;
- aprovacao/rejeicao;
- edicao controlada;
- historico;
- metricas basicas.

### Fase 5 - Otimizacao e escala

Objetivo: transformar em produto comercial.

Entregas:

- fila de processamento;
- controle de limites por plano;
- billing ou controle manual de plano;
- relatorios;
- notificacoes;
- integracoes futuras;
- templates por nicho.

---

## 15. Criterios de Aceite

### CA01 - Cadastro completo da imobiliaria

Dado um administrador CSR, quando cadastrar uma imobiliaria, entao o sistema deve salvar dados institucionais, contato, endereco, servicos e regioes.

### CA02 - Configuracao SIGA valida

Dado um cliente cadastrado, quando informar dados da API SIGA, entao o sistema deve salvar a configuracao de forma segura e permitir teste de conexao.

### CA03 - Geracao de post completo

Dado um tema e dados da imobiliaria, quando gerar um post, entao o sistema deve retornar titulo, slug, description, tags e HTML.

### CA04 - Slug estrategico

Dado um post gerado, quando o slug for criado, entao ele deve conter intencao de busca, localizacao e termo imobiliario relevante, salvo quando o tema nao exigir.

### CA05 - Validacao de slug

Dado um slug gerado, quando ele for analisado, entao o sistema deve indicar score e problemas como duplicidade, excesso de tamanho, falta de localizacao ou falta de intencao.

### CA06 - Analise SEO/GEO

Dado um post gerado, quando analisado, entao o sistema deve exibir scores e sugestoes de melhoria.

### CA07 - Edicao antes da publicacao

Dado um post gerado, quando o usuario editar titulo, slug, texto, tags ou description, entao o sistema deve recalcular os scores.

### CA08 - Publicacao como rascunho

Dado um post aprovado para rascunho, quando publicado no SIGA, entao o payload deve enviar `status: 0` e registrar resposta da API.

### CA09 - Publicacao direta

Dado um post aprovado para publicacao, quando publicado no SIGA, entao o payload deve enviar `status: 1` e registrar resposta da API.

### CA10 - Tratamento de erro

Dado erro 400, 401 ou falha de rede, quando a publicacao falhar, entao o sistema deve manter o post salvo e mostrar mensagem clara ao usuario.

### CA11 - Historico

Dado um cliente com posts gerados, quando acessar o historico, entao deve visualizar status, data, scores e retorno da publicacao.

### CA12 - Seguranca

Dado um token de API cadastrado, quando qualquer usuario visualizar logs ou configuracoes, entao o token nao deve aparecer em texto aberto.

---

## 16. Indicadores de Qualidade

### SEO Score

Pontuacao de 0 a 100 baseada em:

- titulo;
- slug;
- meta description;
- estrutura de headings;
- uso de palavras-chave;
- links;
- tags;
- legibilidade.

### GEO Score

Pontuacao de 0 a 100 baseada em:

- clareza de resposta;
- perguntas frequentes;
- entidades locais;
- consistencia semantica;
- autoridade local;
- dados da imobiliaria;
- organizacao do conteudo.

### Slug Score

Pontuacao de 0 a 100 baseada em:

- intencao de busca;
- localizacao;
- termo imobiliario;
- tamanho;
- legibilidade;
- unicidade;
- ausencia de repeticao.

---

## 17. Objetivos ao Final do Projeto

Ao final do projeto, o SaaS devera:

1. permitir cadastrar e configurar imobiliarias clientes da SIGA CRM;
2. gerar posts imobiliarios autorais com foco em SEO e GEO;
3. criar slugs estrategicos para indexacao e sitemap;
4. analisar qualidade do conteudo antes da publicacao;
5. permitir revisao e aprovacao humana;
6. publicar no Blog SIGA CRM via API;
7. registrar historico, logs e retorno da integracao;
8. reduzir dependencia de redatores externos;
9. aumentar a qualidade dos conteudos publicados;
10. fortalecer a autoridade digital das imobiliarias;
11. preparar os blogs para mecanismos de busca tradicionais e motores generativos;
12. criar uma base escalavel para comercializacao pela CSR Tecnologia.

---

## 18. Fora do Escopo Inicial

Para manter o MVP viavel, estes itens ficam para fases futuras:

- monitoramento automatico de posicao no Google;
- integracao direta com Google Search Console;
- criacao automatica de imagens;
- publicacao em redes sociais;
- billing completo;
- integracao com varios CRMs;
- automacao massiva diaria;
- analise de concorrentes em tempo real;
- importacao automatica de imoveis para criar posts especificos.

---

## 19. Referencias de Produto e Integracao

- Documentacao API SIGA Blog: `https://api.sigacrm.com.br/doc/#tag/Blog/operation/postBlog`
- Yoast SEO: `https://wordpress.org/plugins/wordpress-seo/`
- Rank Math Content Analysis API: `https://rankmath.com/kb/content-analysis-api/`
- Google Search - AI optimization guide: `https://developers.google.com/search/docs/fundamentals/ai-optimization-guide`
- Schema.org: `https://schema.org/`

---

## 20. Proxima Etapa Recomendada

A proxima etapa deve ser a criacao do escopo tecnico do MVP, contendo:

- arquitetura tecnica escolhida;
- stack recomendada;
- telas detalhadas;
- endpoints internos;
- modelo final do banco;
- prompts de geracao;
- regras de score SEO/GEO;
- regra completa de slug;
- contrato de integracao com API SIGA;
- plano de testes;
- cronograma de desenvolvimento.

