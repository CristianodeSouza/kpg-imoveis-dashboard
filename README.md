# KPG Imóveis Dashboard

Dashboard web executivo para gerenciamento de dados de marketing da KPG Imóveis, com integração Google My Business, Instagram e campanhas de publicidade.

## 🎨 Design

- **Cores Corporativas**: Navy (#020067) + Gold (#BD851F)
- **Layout Responsivo**: Otimizado para desktop e dispositivos móveis
- **Interface Moderna**: Tabs para organização de dados

## 🚀 Funcionalidades

- ✅ **Google My Business (GMB)**: Dados de performance, avaliações e métricas
- ✅ **Instagram**: Seguidores, engajamento e análises
- ✅ **Campanhas**: Gastos e performance de campanhas
- ✅ **Autenticação**: Login seguro com senha
- ✅ **Acesso Remoto**: Compartilhe via rede local

## 📋 Requisitos

- Python 3.8+
- pip (gerenciador de pacotes Python)
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## 🔧 Instalação

1. **Clone o repositório:**
```bash
git clone https://github.com/seu-usuario/kpg-imoveis-dashboard.git
cd kpg-imoveis-dashboard
```

2. **Instale as dependências:**
```bash
pip install -r requirements.txt
```

3. **Configure as credenciais do Google:**
   - Coloque o arquivo `client_secret.json` na raiz do projeto
   - (Obtenha em: Google Cloud Console > Credenciais)

4. **Inicie o servidor:**
```bash
python app.py
```

5. **Acesse no navegador:**
   - Local: `http://localhost:5000`
   - Rede: `http://192.168.x.x:5000` (veja o IP exibido no terminal)

## 🔑 Senha Padrão

- Senha: `kpg2026`
- Altere em: `data/config.json` (campo `password`)

## 📂 Estrutura do Projeto

```
KPG IMOVEIS/
├── app.py                      # Servidor Flask principal
├── requirements.txt            # Dependências Python
├── scripts/
│   └── fetch_gmb.py           # Script para atualizar dados GMB
├── templates/
│   ├── dashboard.html         # Dashboard principal
│   ├── login.html             # Página de login
│   └── login_v2.html          # Login com design atualizado
├── data/                      # Dados armazenados (gerado automaticamente)
│   ├── config.json            # Configurações da aplicação
│   ├── gmb.json              # Dados do Google My Business
│   ├── instagram.json        # Dados do Instagram
│   └── ads.json              # Dados de campanhas
└── backend/                   # Scripts adicionais de automação
```

## 🔐 Segurança

⚠️ **Importante:**
- Os tokens OAuth são salvos em `gmb_token.json` (NÃO commitar no Git)
- Senhas são armazenadas em `data/config.json` (proteger esse arquivo)
- Use HTTPS em produção (não recomendado para dev)

## 📊 APIs Utilizadas

- **Google My Business API**: Performance e insights
- **Business Account Management API**: Dados da conta

## 🤝 Compartilhamento em Rede

Compartilhe o endereço exibido no terminal com seus colegas:
```
🌐 Rede: http://192.168.3.x:5000
```

**Requisitos para colegas:**
- Estar na mesma rede local
- Digitar a URL no navegador
- Usar a senha configurada

## 📝 Licença

Todos os direitos reservados © KPG Imóveis 2026

## 👤 Autor

Desenvolvido para KPG Imóveis
