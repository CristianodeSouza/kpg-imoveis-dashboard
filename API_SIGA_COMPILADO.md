# API SIGA CRM — KPG Imóveis

**Base URL (proxy do site — USE ESTA):** `https://www.kpgimoveis.com.br/api`  
**Base URL (direta — bloqueada por IP):** `https://api.sigacrm.com.br/kpg`  
**Documentação oficial:** https://api.sigacrm.com.br/doc/  
**Contato:** suporte@sigasoft.com.br

> A URL direta `api.sigacrm.com.br` retorna 403 quando acessada externamente.  
> Usar sempre o proxy do próprio site: `https://www.kpgimoveis.com.br/api/imovel/{ID}`

---

## Autenticação

Todas as rotas usam **Bearer Token** no header:

```http
Authorization: Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eLA
Content-Type: application/json
```

---

## Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/kpg/imoveis` | Listar imóveis com filtros |
| GET | `/kpg/imovel/{ID}` | Detalhes completos de um imóvel |
| GET | `/kpg/condominios` | Listar condomínios/edifícios |
| GET | `/kpg/construtoras` | Listar construtoras |
| GET | `/kpg/imobiliaria` | Dados da imobiliária |
| GET | `/kpg/leads` | Listar leads |
| POST | `/kpg/cadastrar/lead` | Cadastrar novo lead |
| GET | `/kpg/usuarios` | Listar usuários/corretores |
| GET | `/kpg/bairros` | Listar bairros |
| GET | `/kpg/cidades` | Listar cidades |

---

## Listar Imóveis — GET /kpg/imoveis

Retorna array `data[]` com campos resumidos + objeto `meta` de paginação.

### Exemplo de requisição com filtros

```http
GET https://api.sigacrm.com.br/kpg/imoveis
Authorization: Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eLA
Content-Type: application/json

{
  "limite": 40,
  "page": 1,
  "operacao": "vendas",
  "tipo": "apartamentos",
  "cidade": "gramado",
  "destaque": 1
}
```

### Parâmetros de filtro

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `limite` | integer | `40` | Máximo por página |
| `page` | integer | `1` | Página da listagem |
| `operacao` | string | — | `vendas`, `aluguel`, `temporada` |
| `aluguelTipo` | string | — | `anual`, `estudante` (usar com `operacao=aluguel`) |
| `tipo` | string | — | `apartamentos`, `casas`, `comercial`, `terreno` |
| `uf` | string | — | Estado. Ex: `rs` |
| `cidade` | string | — | Cidade. Ex: `gramado`. Aceita múltiplos separados por vírgula |
| `bairro` | string | — | Bairro. Ex: `centro` |
| `garagem` | string | — | Qtd. de vagas. Aceita múltiplos por vírgula |
| `banheiro` | string | — | Qtd. de banheiros. Aceita múltiplos por vírgula |
| `suites` | string | — | Qtd. de suítes. Aceita múltiplos por vírgula |
| `dorm` | integer | — | Qtd. de dormitórios. Aceita múltiplos por vírgula |
| `perfil` | string | — | `pre_lancamento`, `lancamento`, `construcao`, `novo`, `usado`. Aceita múltiplos |
| `mobilia` | integer | — | `1`=Mobiliado, `2`=Semi, `3`=Mob/Semi, `4`=Sem Mobília |
| `destaque` | integer | — | `1` = imóveis em destaque |
| `altoPadrao` | integer | `0` | `1` = Alto Padrão |
| `investidor` | integer | `0` | `1` = Investidor |
| `repasse` | integer | `0` | `1` = Repasse |
| `mcmv` | integer | `0` | `1` = Minha Casa Minha Vida |
| `especial` | integer | `0` | `1` = Especial/Diamante |
| `nome` | string | — | Busca por nome, anúncio ou endereço |
| `valorMinimo` | string | — | Preço mínimo. Ex: `500000` |
| `valorMaximo` | string | — | Preço máximo. Ex: `2000000` |
| `areaMinima` | string | — | Área mínima m² |
| `areaMaxima` | string | — | Área máxima m² |
| `ordem` | integer | — | `1`=Maior Valor, `2`=Menor Valor, `3`=Últimos, `4`=Aleatório |
| `idCondominio` | integer | — | Filtrar por ID do condomínio |
| `idConstrutora` | integer | — | Filtrar por ID da construtora |
| `idImovel` | integer | — | Filtrar por ID interno. Aceita múltiplos |
| `codigoImovel` | integer | — | Filtrar por código do CRM. Aceita múltiplos |
| `dataInicial` | string | — | Data de cadastro inicial. Formato: `2024-01-01` |
| `dataFinal` | string | — | Data de cadastro final. Formato: `2024-12-31` |

### Resposta 200

```json
{
  "data": [
    {
      "ID": 3461920,
      "Codigo": 3461920,
      "Categoria": "Vendas",
      "Nome": "KUBE HOME RESORT",
      "Bairro": "São Cristóvão",
      "Cidade": "Passo Fundo",
      "UF": "RS",
      "Perfil": "Lançamento",
      "Fotos": [
        {
          "Foto_Grande": "https://cdn.gocache.net/kpg/img_vendas/g1_....jpeg",
          "Foto_Media": "https://cdn.gocache.net/kpg/img_vendas/i1_....jpeg",
          "Foto_Pequena": "https://cdn.gocache.net/kpg/img_vendas/m1_....jpeg"
        }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 40,
    "per_page": 40,
    "total": 79
  }
}
```

---

## Detalhar Imóvel — GET /kpg/imovel/{ID}

Retorna objeto `data{}` com todos os campos detalhados.

### Busca por código do CRM

```python
# Opção 1: pelo código
GET /kpg/imoveis  +  body: { "codigoImovel": 123 }  →  pega o ID do resultado

# Opção 2: pelo ID interno (direto)
GET /kpg/imovel/3461920
```

### Dados retornados

**Identificação**
- `ID`, `Codigo`, `Categoria`, `Nome`, `Situacao`, `URL`, `Status`

**Localização**
- `Endereco`, `Numero`, `Complemento`, `Unidade`, `Bairro`, `Cidade`, `UF`
- `Latitude`, `Longitude`, `MostrarMapa`, `EnderecoRestrito`

**Valores**
- `Tipo[].Valor` — valor por tipologia
- `ValorDe` — valor anterior
- `ValorCondominio`, `ValorIPTU`, `ValorSeguro`
- `ValorRestrito`, `ObsValores`

**Características físicas**
- `AreaGlobal`, `AreaPrivativa`, `AreaComum`, `AreaTotalGlobal`, `AreaTotalPrivativa`
- `Garagem`, `Suites`, `DemiSuite`, `SuiteMaster`, `Banheiros`, `Lavabos`
- `Perfil`, `Mobilia`, `Financiamento`, `Exclusividade`, `AceitaPet`

**Diferenciais (boolean)**
- `Sacada`, `Terraco`, `Showroom`, `AreaLazer`, `Piscina`, `Churrasqueira`
- `Elevador`, `DependenciaEmpregada`, `MinhaCasaMinhaVida`
- `AltoPadrao`, `Investidor`, `Especial`, `PosicaoImovel`, `PosicaoSolar`

**Mídia**
- `Video` — link do vídeo
- `TourVirtual` — link do tour 360°
- `Descricao[]` — `{ Titulo, Texto (HTML) }`
- `Caracteristicas{}` — itens agrupados por categoria
- `Fotos{}` — agrupadas por pasta (`Apresentacao`, etc.)
- `FotosEdificio[]` — fotos do condomínio/edifício

**Corretor**
- `Agenciador.Nome`, `.Email`, `.Fone`, `.Foto`, `.Imobiliaria`

---

## Formato das Imagens

As imagens são servidas diretamente pelo CDN — **não requerem autenticação**.

```
Foto_Grande:   g1_{ID}_{...}.jpeg   ← Alta resolução (usar para Instagram)
Foto_Media:    i1_{ID}_{...}.jpeg   ← Intermediária
Foto_Pequena:  m1_{ID}_{...}.jpeg   ← Thumbnail
```

- `Fotos{}` — fotos do imóvel, organizadas por pasta (ex: `Apresentacao`)
- `FotosEdificio[]` — fotos do condomínio/edifício (fachada, áreas comuns)

As URLs `Foto_Grande` do CDN são **URLs públicas diretas**, compatíveis com o Instagram Graph API sem necessidade de re-hospedagem.

---

## Fluxo do Agente de Publicação

```
1. GET /kpg/imoveis  →  body: { "codigoImovel": CODIGO }
2. Extrai o ID do primeiro resultado
3. GET /kpg/imovel/{ID}  →  dados completos
4. Pega a primeira Foto_Grande (URL pública do CDN)
5. Gera legenda via CaptionGenerator (IA ou template)
6. POST graph.facebook.com/{IG_ID}/media  →  container com a URL da foto
7. POST graph.facebook.com/{IG_ID}/media_publish  →  publica o post
```

Ver implementação: `backend/agents/imovel_post_agent.py`

---

## Notas Importantes

- **Rate limit:** se receber `429`, aguardar 60s antes de tentar novamente (já tratado no `SigaExtractor`)
- **Listagem vs. Detalhe:** a listagem tem `Fotos` como array simples; o detalhe tem `Fotos` como objeto com pastas
- **Valores:** `Tipo[0].Valor` na listagem; campos detalhados de valor só vêm no endpoint de detalhe
- **Código vs. ID:** o `Codigo` é o número visível no CRM; o `ID` é o identificador interno da API

---

*Documentação compilada em 30/04/2026 — API SIGA CRM v1.0*
