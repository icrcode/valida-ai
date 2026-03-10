# Valida AI

ETL de captação de documentos universitários com triagem e classificação utilizando arquitetura baseada em eventos.

**Valida AI** é um sistema que automatiza o processamento de documentos universitários através de um pipeline ETL event-driven:

1. **Captação (Extract)**
   - Recebe documentos (PDFs, imagens, etc) via upload
   - Armazena no MinIO com rastreamento

2. **Triagem e Classificação (Transform)**
   - Processa documentos de forma assíncrona
   - Valida conteúdo e formato
   - Classifica automaticamente por tipo (diplomas, certificados, históricos, etc)
   - Extrai metadados e informações relevantes

3. **Armazenamento (Load)**
   - Persiste dados estruturados no PostgreSQL
   - Mantém histórico de processamento
   - Permite consultas e análises

**Arquitetura Event-Driven**: Cada ação dispara eventos que desencadeiam processamento assíncrono através de geradores de filas, garantindo escalabilidade e rastreabilidade total.

## Pré-requisitos

- Docker e Docker Compose
- Node.js (para desenvolvimento local)
- npm ou yarn

### Iniciar Infraestrutura

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Isso inicia:

- **PostgreSQL 16** em `localhost:5432`
- **Redis** em `localhost:6379`
- **MinIO Console** em `localhost:9001` (minioadmin:minioadmin)

### Setup do Backend

```bash
cd backend
npm install
npm run dev
```

Servidor rodará em `http://localhost:3000`

Verificar saúde: `curl http://localhost:3000/verificacao`

## Estrutura do Projeto

```bash

valida-ai/
├── backend/                 # API e serviços Node.js + TypeScript
│   ├── src/                # Código fonte
│   ├── dist/               # Build compilado
│   ├── package.json
│   └── README.md           # Documentação do backend
├── frontend/               # Dashboard web (a implementar)
├── infra/                  # Scripts e configurações de infraestrutura
├── docker-compose.dev.yml  # Serviços (PostgreSQL, Redis, MinIO)
├── .env.docker.example     # Variáveis Docker
└── README.md              # Este arquivo
```

## Desenvolvimento

### Backend

```bash
cd backend

# Modo desenvolvimento com hot reload
npm run dev

# Build
npm run build

# Linting e formatação
npm run lint
npm run lint:fix
npm run format
```

## Documentação

- [Backend](./backend/README.md) - Guia completo da API
- [Docker Compose](./docker-compose.dev.yml) - Configuração dos serviços

## Serviços

### PostgreSQL 16

- Host: `localhost:5432`
- Usuário: `postgres`
- Senha: `postgres`
- DB: `valida_db`

### Redis

- Host: `localhost:6379`
- Sem senha padrão

### MinIO

- API: `http://localhost:9000`
- Console: `http://localhost:9001`
- Usuário: `minioadmin`
- Senha: `minioadmin`

## Variáveis de Ambiente

Veja `.env.docker.example` para Docker e `backend/.env.example` para o backend.

## Convenções

- Código em **português** (variáveis, funções, comentários)
- TypeScript com strict mode
- ESLint + Prettier para formatação
- Logs estruturados com Winston
- Arquitetura orientada por eventos (Event-Driven)
- Processamento assíncrono para ETL

---