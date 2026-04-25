# API SIGA CRM — KPG Imóveis

## Autenticação
- **Header:** `Authorization: Bearer 83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eLA`
- **Base URL:** `https://api.sigacrm.com.br/kpg`
- **Limite:** Requisições limitadas por minuto — aguardar entre chamadas se necessário

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

## Buscar Imóvel por Código

### Opção 1 — Por código do CRM
```
GET /kpg/imoveis
Body JSON: { "codigoImovel": 123 }
```

### Opção 2 — Por ID interno
```
GET /kpg/imovel/{ID}
```

---

## Filtros Disponíveis em /imoveis

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `codigoImovel` | integer | Código do imóvel no CRM |
| `idImovel` | integer | ID interno |
| `operacao` | string | `vendas`, `aluguel`, `temporada` |
| `tipo` | string | `apartamentos`, `casas`, `comercial`, `terreno` |
| `cidade` | string | Nome da cidade |
| `bairro` | string | Nome do bairro |
| `uf` | string | Sigla do estado (ex: `sp`) |
| `dorm` | integer | Nº de dormitórios |
| `suites` | integer | Nº de suítes |
| `garagem` | integer | Nº de vagas |
| `banheiro` | integer | Nº de banheiros |
| `valorMinimo` | string | Preço mínimo |
| `valorMaximo` | string | Preço máximo |
| `areaMinima` | string | Área mínima m² |
| `areaMaxima` | string | Área máxima m² |
| `perfil` | string | `pre_lancamento`, `lancamento`, `construcao`, `novo`, `usado` |
| `mobilia` | integer | 1=Mobiliado, 2=Semi, 3=Mob/Semi, 4=Sem |
| `destaque` | integer | 0 ou 1 |
| `altoPadrao` | integer | 1 = Alto Padrão |
| `investidor` | integer | 1 = Investidor |
| `ordem` | integer | 1=Maior Valor, 2=Menor Valor, 3=Últimos, 4=Aleatório |
| `limite` | integer | Máx por página (padrão: 40) |
| `page` | integer | Página (padrão: 1) |
| `dataInicial` | string | Data inicial cadastro (ex: `2024-01-01`) |
| `dataFinal` | string | Data final cadastro (ex: `2024-12-31`) |

---

## Dados Retornados por Imóvel

### Identificação
- `ID` — ID interno
- `Codigo` — Código no CRM
- `Categoria` — Vendas / Aluguel / Temporada
- `Nome` — Nome do imóvel
- `Situacao` — À Venda, Alugado, etc.
- `URL` — Link do imóvel no site

### Localização
- `Endereco`, `Numero`, `Complemento`, `Unidade`
- `Bairro`, `Cidade`, `UF`
- `Latitude`, `Longitude`

### Valores
- `Tipo[].Valor` — Valor por tipologia
- `ValorDe` — Valor anterior (riscado)
- `ValorCondominio` — Taxa de condomínio
- `ValorIPTU` — IPTU
- `ValorSeguro` — Seguro

### Características
- `AreaGlobal`, `AreaPrivativa`, `AreaComum`, `AreaTotalGlobal`
- `Garagem`, `Suites`, `DemiSuite`, `SuiteMaster`
- `Banheiros`, `Lavabos`
- `Perfil` — Lançamento, Novo, Usado, etc.
- `Mobilia` — Mobiliado, Semi, Sem Mobília
- `Financiamento`, `Exclusividade`, `AceitaPet`

### Diferenciais (boolean)
- `Sacada`, `Terraco`, `Showroom`
- `AreaLazer`, `Piscina`, `Churrasqueira`
- `Elevador`, `DependenciaEmpregada`
- `MinhaCasaMinhaVida`, `AltoPadrao`, `Investidor`

### Mídia
- `Video` — Link do vídeo
- `TourVirtual` — Link do tour 360°
- `Descricao[]` — Textos descritivos (título + HTML)
- `Caracteristicas{}` — Itens por categoria

### Corretor (Agenciador)
- `Nome`, `Email`, `Fone`, `Fone2`
- `Foto` — URL da foto do corretor
- `Imobiliaria`

---

## Formato das Imagens

As imagens são retornadas como URLs diretas no CDN. Existem 3 tamanhos:

```
Foto_Grande:   g1_{ID}_{...}.jpeg   ← Alta resolução
Foto_Media:    i1_{ID}_{...}.jpeg   ← Intermediária
Foto_Pequena:  m1_{ID}_{...}.jpeg   ← Thumbnail
```

### Tipos de fotos
- **`Fotos`** — Fotos do imóvel, organizadas por pasta (ex: `Apresentacao`)
- **`FotosEdificio`** — Fotos do condomínio/edifício (fachada, áreas comuns)

Para **baixar as imagens**, basta fazer um GET na URL retornada — não requer autenticação.

---

## Fluxo do App

```
1. Usuário informa o código do imóvel
2. GET /kpg/imoveis  →  body: { "codigoImovel": CODIGO }
3. Pega o ID retornado
4. GET /kpg/imovel/{ID}  →  dados completos
5. Exibe fotos, valores, características, localização, corretor
6. Download de imagens via Foto_Grande / Foto_Media / Foto_Pequena
```
