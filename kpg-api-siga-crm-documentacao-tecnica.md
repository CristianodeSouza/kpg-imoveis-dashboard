# 📋 Documentação Técnica — API SIGA CRM
### Projeto: KPG

**Base URL:** `https://api.sigacrm.com.br/kpg`  
**Documentação oficial:** https://api.sigacrm.com.br/doc/  
**Versão:** 1.0  
**Contato:** suporte@sigasoft.com.br

---

## 🔐 Autenticação

Todas as rotas da API utilizam autenticação do tipo **Bearer Token**.

O token deve ser enviado no **header** de todas as requisições:

| Header | Valor |
|---|---|
| `Authorization` | `Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eL` |
| `Content-Type` | `application/json` |

**Exemplo de header completo:**
```http
Content-Type: application/json
Authorization: Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eL
```

> O token é único e identifica a imobiliária **KPG** na plataforma SIGA CRM.

---

## 🏠 Imóveis

### 1. Listar Imóveis

Lista todos os imóveis publicados da imobiliária KPG. Permite aplicar filtros para refinar os resultados.

**Método:** `GET`  
**URL:** `https://api.sigacrm.com.br/kpg/imoveis`  
**Content-Type:** `application/json`  
**Authorization:** `Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eL`

#### Exemplo de Requisição

```http
GET https://api.sigacrm.com.br/kpg/imoveis
Content-Type: application/json
Authorization: Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eL
```

#### Exemplo de Requisição com Filtros

```http
GET https://api.sigacrm.com.br/kpg/imoveis
Content-Type: application/json
Authorization: Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eL

{
  "limite": 40,
  "page": 1,
  "operacao": "vendas",
  "aluguelTipo": "anual",
  "tipo": "apartamentos",
  "uf": "rs",
  "cidade": "gramado",
  "bairro": "centro",
  "garagem": 1,
  "banheiro": 1,
  "suites": 1,
  "perfil": "pre_lancamento",
  "mobilia": 1,
  "destaque": 0,
  "dorm": 1,
  "nome": "apartamento mobiliado",
  "valorMinimo": 500000,
  "valorMaximo": 2000000,
  "areaMinima": 50,
  "areaMaxima": 100,
  "ordem": 1,
  "altoPadrao": 1,
  "investidor": 1,
  "idCondominio": 123,
  "idConstrutora": 123,
  "idImovel": 123,
  "codigoImovel": 123,
  "repasse": 1,
  "mcmv": 1,
  "especial": 1,
  "dataInicial": "2024-01-01",
  "dataFinal": "2024-06-01"
}
```

#### Parâmetros (Query Parameters / Body)

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `limite` | integer | Não | `40` | Máximo de imóveis exibidos por página |
| `page` | integer | Não | `1` | Página da listagem |
| `operacao` | string | Não | — | Filtro por operação: `"vendas"`, `"aluguel"`, `"temporada"` |
| `aluguelTipo` | string | Não | `""` | Tipo de aluguel: `"anual"`, `"estudante"`. Usar junto com `operacao=aluguel` |
| `tipo` | string | Não | — | Tipologia: `"apartamentos"`, `"casas"`, `"comercial"`, `"terreno"` |
| `uf` | string | Não | — | Estado. Ex: `"rs"` |
| `cidade` | string | Não | — | Cidade. Ex: `"gramado"`. Aceita múltiplos valores separados por vírgula |
| `bairro` | string | Não | — | Bairro. Ex: `"centro"` |
| `garagem` | string | Não | — | Qtd. de vagas. Ex: `1`. Aceita múltiplos valores separados por vírgula |
| `banheiro` | string | Não | — | Qtd. de banheiros. Aceita múltiplos valores separados por vírgula |
| `suites` | string | Não | — | Qtd. de suítes. Aceita múltiplos valores separados por vírgula |
| `perfil` | string | Não | — | Perfil: `"pre_lancamento"`, `"lancamento"`, `"construcao"`, `"novo"`, `"usado"`. Aceita múltiplos separados por vírgula |
| `mobilia` | integer | Não | — | `1` = Mobiliado, `2` = Semi-mobiliado, `3` = Mobiliado OU Semi-mobiliado, `4` = Sem Mobília |
| `destaque` | integer | Não | — | `0` ou `1` — imóveis em destaque (ex: home do site) |
| `dorm` | integer | Não | — | Qtd. de dormitórios: `1`, `2`, `3`. Aceita múltiplos separados por vírgula |
| `nome` | string | Não | — | Busca por nome, anúncio ou endereço. Ex: `"apartamento mobiliado"` |
| `valorMinimo` | string | Não | — | Preço mínimo. Ex: `500000` |
| `valorMaximo` | string | Não | — | Preço máximo. Ex: `2000000` |
| `areaMinima` | string | Não | — | Área mínima em m². Ex: `50` |
| `areaMaxima` | string | Não | — | Área máxima em m². Ex: `100` |
| `ordem` | integer | Não | — | `1` = Maior Valor, `2` = Menor Valor, `3` = Últimos Cadastrados, `4` = Randomicamente |
| `altoPadrao` | integer | Não | `0` | `1` = Filtra imóveis marcados como Alto Padrão |
| `investidor` | integer | Não | `0` | `1` = Filtra imóveis marcados para Investidor |
| `idCondominio` | integer | Não | — | Filtra por ID do condomínio/edifício |
| `idConstrutora` | integer | Não | — | Filtra por ID da construtora |
| `idImovel` | integer | Não | — | Filtra por ID do imóvel. Aceita múltiplos separados por vírgula |
| `codigoImovel` | integer | Não | — | Filtra por código do imóvel. Aceita múltiplos separados por vírgula |
| `repasse` | integer | Não | `0` | `1` = Filtra imóveis com marcação de repasse |
| `mcmv` | integer | Não | `0` | `1` = Filtra imóveis Minha Casa, Minha Vida |
| `especial` | integer | Não | `0` | `1` = Filtra imóveis com marcação especial/diamante |
| `dataInicial` | string | Não | — | Data de cadastro inicial. Formato: `"2024-01-01"` |
| `dataFinal` | string | Não | — | Data de cadastro final. Formato: `"2024-06-01"` |

#### Respostas

| Código | Descrição |
|---|---|
| `200` | Requisição realizada com sucesso |
| `400` | Requisição inválida |

#### Exemplo de Resposta — 200

```json
{
  "data": [
    {
      "ID": 3461920,
      "Idimob": 1,
      "Categoria": "Vendas",
      "Codigo": 3461920,
      "Agenciador": {
        "Nome": "Guilherme Rocha",
        "Idimob": 1,
        "Imobiliaria": "BETA BETA",
        "Email": "suporte@sigasoft.com.br",
        "Fone": "(54) 996936784",
        "Fone2": null,
        "Foto": "https://cdn.gocache.net/beta/img_imobiliaria/musuario_195.jpg",
        "Mostrar": true,
        "MostrarFone": true,
        "MostrarEmail": true
      },
      "Nome": "KUBE HOME RESORT",
      "Anuncio": null,
      "URL": "https://template.sigacrm.com.br/beta/imovel/venda-apartamentos-02-dormitorio-em-passo-fundo/kube-home-resort/3461920",
      "Endereco": null,
      "Bairro": "São Cristóvão",
      "Cidade": "Passo Fundo",
      "UF": "RS",
      "Latitude": -28.27011194253861,
      "Longitude": -52.37942680555727,
      "Perfil": "Lançamento",
      "Mobilia": "Sem mobilia",
      "PalavraDestaque": null,
      "Especial": true,
      "PosicaoImovel": true,
      "PosicaoSolar": true,
      "AltoPadrao": true,
      "Investidor": true,
      "Garagem": 0,
      "Suites": "8 ou 10",
      "Banheiros": 0,
      "ValorDe": 0,
      "ValorRestrito": true,
      "Exclusividade": true,
      "DataCadastro": "27/06/2023",
      "Tipo": [
        {
          "Id": 4,
          "Tipo": "Apartamentos 02 Dorm.",
          "Dormitorios": 2,
          "Valor": 780
        }
      ],
      "Video": null,
      "AreaTotal": 15000,
      "AreaPrivativa": 7500,
      "Fotos": [
        {
          "Titulo": null,
          "Foto_Grande": "https://cdn.gocache.net/beta/img_vendas/g1_3461920_99273_1524_290623.jpeg",
          "Foto_Media": "https://cdn.gocache.net/beta/img_vendas/i1_3461920_99273_1524_290623.jpeg",
          "Foto_Pequena": "https://cdn.gocache.net/beta/img_vendas/m1_3461920_99273_1524_290623.jpeg",
          "Posicao": 0,
          "Pasta": "Apresentacao"
        }
      ],
      "FotosEdificio": [
        {
          "Titulo": "FACHADA NOTURNA",
          "Foto_Grande": "https://cdn.gocache.net/beta/img_edificios/g1_446_335_1839_030620.jpg",
          "Foto_Media": "https://cdn.gocache.net/beta/img_edificios/i1_446_335_1839_030620.jpg",
          "Foto_Pequena": "https://cdn.gocache.net/beta/img_edificios/m1_446_335_1839_030620.jpg",
          "Posicao": 0
        }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 40,
    "per_page": 2,
    "to": 2,
    "total": 79
  }
}
```

---

### 2. Exibir um Imóvel

Exibe todos os detalhes de um imóvel específico pelo seu ID.

**Método:** `GET`  
**URL:** `https://api.sigacrm.com.br/kpg/imovel/{ID}`  
**Content-Type:** `application/json`  
**Authorization:** `Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eL`

#### Path Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ID` | integer | **Sim** | ID do imóvel que deseja obter os detalhes |

#### Exemplo de Requisição

```http
GET https://api.sigacrm.com.br/kpg/imovel/3461920
Content-Type: application/json
Authorization: Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eL
```

#### Respostas

| Código | Descrição |
|---|---|
| `200` | Requisição realizada com sucesso |
| `400` | ID inválido |
| `404` | Não encontrado |

#### Exemplo de Resposta — 200

```json
{
  "data": {
    "ID": 3461920,
    "Codigo": 3461920,
    "Idimob": 1,
    "Imobiliaria": "BETA BETA",
    "Categoria": "Vendas",
    "Agenciador": {
      "Nome": "Guilherme Rocha",
      "Idimob": 1,
      "Imobiliaria": "BETA BETA",
      "Email": "suporte@sigasoft.com.br",
      "Fone": "(54) 996936784",
      "Fone2": null,
      "Foto": "https://cdn.gocache.net/beta/img_imobiliaria/musuario_195.jpg",
      "Mostrar": true,
      "MostrarFone": true,
      "MostrarEmail": true
    },
    "Nome": "KUBE HOME RESORT",
    "Anuncio": null,
    "URL": "https://template.sigacrm.com.br/beta/imovel/venda-apartamentos-02-dormitorio-em-passo-fundo/kube-home-resort/3461920",
    "Status": 1,
    "Tipo": [
      {
        "Id": 4,
        "Tipo": "Apartamentos 02 Dorm.",
        "Dormitorios": 2,
        "Valor": 780
      }
    ],
    "Endereco": null,
    "Numero": null,
    "Unidade": null,
    "Complemento": null,
    "PontoReferencia": null,
    "Bairro": "São Cristóvão",
    "Cidade": "Passo Fundo",
    "UF": "RS",
    "Latitude": -28.27011194253861,
    "Longitude": -52.37942680555727,
    "MostrarMapa": true,
    "EnderecoRestrito": true,
    "Perfil": "Lançamento",
    "Mobilia": "Sem mobilia",
    "PalavraDestaque": null,
    "ValorDe": 0,
    "ValorRestrito": true,
    "ValorSeguro": null,
    "MostraValorSeguro": true,
    "ValorCondominio": null,
    "MostraValorCondominio": true,
    "ValorIPTU": null,
    "ValorIPTUTipo": null,
    "MostraValorIPTU": true,
    "Financiamento": true,
    "ObsValores": null,
    "ObsValoresAdicionais": null,
    "Sacada": true,
    "Showroom": true,
    "Terraco": true,
    "DependenciaEmpregada": true,
    "AreaLazer": true,
    "Piscina": true,
    "Churrasqueira": true,
    "Andar": true,
    "Elevador": true,
    "MinhaCasaMinhaVida": true,
    "PosicaoImovel": true,
    "PosicaoSolar": true,
    "DataEntrega": null,
    "Prenotacao": null,
    "Incorporacao": null,
    "Situacao": "À Venda",
    "Exclusividade": true,
    "Especial": true,
    "AceitaPet": true,
    "AltoPadrao": true,
    "Investidor": true,
    "DistanciaMar": null,
    "AreaGlobal": 15000,
    "AreaPrivativa": 7500,
    "AreaComum": 7500,
    "AreaTotalGlobal": 15000,
    "AreaTotalPrivativa": 7500,
    "Garagem": 0,
    "Suites": "8 ou 10",
    "DemiSuite": 0,
    "SuiteMaster": 0,
    "Banheiros": 0,
    "Lavabos": 0,
    "Descricao": [
      {
        "Titulo": "Descrição Imóvel",
        "Texto": "<p>Texto sobre o imóvel</p>"
      }
    ],
    "Fotos": {
      "Apresentacao": [
        {
          "Titulo": null,
          "Foto_Grande": "https://cdn.gocache.net/beta/img_vendas/g1_3461920_99273_1524_290623.jpeg",
          "Foto_Media": "https://cdn.gocache.net/beta/img_vendas/i1_3461920_99273_1524_290623.jpeg",
          "Foto_Pequena": "https://cdn.gocache.net/beta/img_vendas/m1_3461920_99273_1524_290623.jpeg",
          "Posicao": 0,
          "Pasta": "Apresentacao"
        }
      ]
    },
    "FotosEdificio": [
      {
        "Titulo": "FACHADA NOTURNA",
        "Foto_Grande": "https://cdn.gocache.net/beta/img_edificios/g1_446_335_1839_030620.jpg",
        "Foto_Media": "https://cdn.gocache.net/beta/img_edificios/i1_446_335_1839_030620.jpg",
        "Foto_Pequena": "https://cdn.gocache.net/beta/img_edificios/m1_446_335_1839_030620.jpg",
        "Posicao": 0
      }
    ],
    "Video": null,
    "TourVirtual": null,
    "Caracteristicas": {
      "ACABAMENTOS": [
        {
          "Nome": "Acabamento em Gesso",
          "Categoria": "ACABAMENTOS"
        }
      ],
      "DO APARTAMENTO": [
        {
          "Nome": "Churrasqueira",
          "Categoria": "DO APARTAMENTO"
        }
      ]
    }
  }
}
```

---

## 📌 Observações Gerais

**Variáveis de rota:**
- `kpg` — identificador fixo da imobiliária KPG na plataforma SIGA CRM
- `{ID}` — ID numérico do imóvel

**Diferença entre Listar vs. Exibir:**
- **Listar imóveis** retorna um array `data[]` com campos resumidos + objeto `meta` de paginação
- **Exibir um imóvel** retorna um único objeto `data{}` com todos os campos detalhados, incluindo `Descricao`, `Caracteristicas`, `TourVirtual`, dados de valores (IPTU, condomínio), `Situacao`, etc.

**Fotos:**
- Na listagem, `Fotos` é um array simples
- No detalhe, `Fotos` é um objeto com pastas (ex: `"Apresentacao"`) contendo arrays de imagens

**Tamanhos de fotos disponíveis:** `Foto_Grande`, `Foto_Media`, `Foto_Pequena`

---

*Documentação gerada em 29/04/2026 — API SIGA CRM v1.0 — Projeto KPG*
