# Backend - Valida AI

API backend do projeto Valida AI construída com Node.js, TypeScript e Express.

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Docker (para serviços: PostgreSQL, Redis, MinIO)

## Setup Inicial

### 1. Instalações de Dependências

```bash
npm install
```

### 2. Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Configure as variáveis conforme necessário.

## Scripts Disponíveis

- **`npm run dev`** - Inicia o servidor em modo desenvolvimento com hot reload (ts-node + nodemon)
- **`npm run build`** - Compila TypeScript para JavaScript em `dist/`
- **`npm start`** - Executa o servidor compilado em produção
- **`npm run lint`** - Executa ESLint para verificar code style
- **`npm run lint:fix`** - Corrige problemas de code style automaticamente
- **`npm run format`** - Formata código com Prettier

## Estrutura do Projeto

```bash

backend/
├── src/
│   ├── configuracao.ts        # Configurações da aplicação
│   ├── aplicativo.ts          # Setup do Express
│   ├── servidor.ts            # Ponto de entrada do servidor
│   ├── rotas/                 # Rotas da API
│   │   └── verificacao.ts     # Endpoint de verificação de saúde
│   ├── middleware/            # Middlewares customizados
│   └── utils/                 # Utilitários
│       └── registrador.ts     # Winston logger
├── dist/                      # Build compilado (gerado por tsc)
├── logs/                      # Arquivos de log
├── .env                       # Variáveis de ambiente (local)
├── .env.example               # Template de variáveis de ambiente
├── tsconfig.json              # Configuração do TypeScript
├── .eslintrc.json             # Configuração do ESLint
├── .prettierrc.json           # Configuração do Prettier
└── package.json               # Dependências do projeto
```

## Serviços Externos

O projeto utiliza serviços executados via Docker Compose (raiz do projeto):

- **PostgreSQL 16**: `localhost:5432`
  - Usuário: `postgres`
  - Senha: `postgres`
  - Base de Dados: `valida_db`

- **Redis**: `localhost:6379`

- **MinIO**:
  - API: `localhost:9000`
  - Console: `localhost:9001` (minioadmin:minioadmin)

## Verificação de Saúde

O servidor expõe um endpoint de verificação de saúde:

```bash
GET /verificacao
```

Resposta esperada:

```json
{
  "status": "ok",
  "timestamp": "2026-03-10T18:24:00.939Z",
  "servico": "valida-api",
  "tempoLigado": 40.619123
}
```

## Desenvolvimento

### Modo Recarga Automática

```bash
npm run dev
```

O servidor iniciará em `http://localhost:3000` com auto-recarregamento em caso de mudanças de código.

### Análise de Código e Formatação

```bash
npm run lint          # Verifica estilo de código
npm run lint:fix      # Corrige automaticamente
npm run format        # Formata com Prettier
```

## Compilação e Implantação

### Compilação

```bash
npm run build
```

Isso gera os arquivos JavaScript compilados em `dist/`.

### Produção

```bash
npm start
```

## Logging

Os logs são gerenciados pelo Winston e salvos em:

- `logs/combinado.log` - Todos os logs
- `logs/erro.log` - Apenas erros

No console, você verá logs coloridos em tempo real.

## Variáveis de Ambiente Disponíveis

| Variável | Padrão | Descrição |
| ---------- | -------- | ----------- |
| NODE_ENV | development | Ambiente (development/production) |
| PORT | 3000 | Porta do servidor |
| DB_HOST | localhost | Servidor do PostgreSQL |
| DB_PORT | 5432 | Porta do PostgreSQL |
| DB_USER | postgres | Usuário do PostgreSQL |
| DB_PASSWORD | postgres | Senha do PostgreSQL |
| DB_NAME | valida_db | Nome da base de dados |
| REDIS_HOST | localhost | Servidor do Redis |
| REDIS_PORT | 6379 | Porta do Redis |
| MINIO_ENDPOINT | localhost:9000 | Endpoint do MinIO |
| MINIO_ACCESS_KEY | minioadmin | Chave de acesso do MinIO |
| MINIO_SECRET_KEY | minioadmin | Chave secreta do MinIO |
| LOG_LEVEL | info | Nível de log (error/warn/info/debug) |

## Dependências Principais

- **express** - Framework web
- **typescript** - Tipagem estática
- **knex** - Construtor de consultas para base de dados
- **pg** - Driver PostgreSQL
- **zod** - Validação de dados
- **winston** - Registro de logs
- **cors** - Middleware CORS
- **helmet** - Cabeçalhos HTTP de segurança

## Dependências de Desenvolvimento

- **ts-node** - Executa TypeScript diretamente
- **nodemon** - Auto-recarregamento
- **eslint** - Análise de código
- **prettier** - Formatação de código
- **@typescript-eslint** - ESLint para TypeScript

## Solução de Problemas

### Porta 3000 já está em uso

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### Erro de compilação TypeScript

Verifique se todas as dependências estão instaladas:

```bash
npm install
npm run build
```

### Logs não aparecem

Verifique a variável `LOG_LEVEL` no `.env`:

```bash
LOG_LEVEL=info
```

Valores válidos: `error`, `warn`, `info`, `debug`

---

## 📝 Notas

- Os nomes de variáveis e arquivos foram traduzidos para português
- Endpoints mantêm nomes em português (ex: `/verificacao` em vez de `/health`)
- Variáveis de ambiente mantêm nomes em inglês por padrão (ex: `NODE_ENV`, `DB_HOST`)
- Para manter compatibilidade de configuração, variáveis de ambiente seguem padrões internacionais
