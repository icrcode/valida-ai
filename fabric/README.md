# Hyperledger Fabric — Valida AI

Rede permissionada que replica, entre organizações, o registro imutável do ciclo de vida dos
documentos. Complementa a cadeia própria (PostgreSQL): o Fabric **impede** transições inválidas no
endosso e serve de **âncora** para a cadeia própria (checkpoints). Fundamentação em
[docs/pesquisa/PESQUISA.md](../docs/pesquisa/PESQUISA.md).

```
fabric/
├── chaincode/valida-documentos/   chaincode TypeScript (fabric-contract-api 2.5)
│   ├── src/contrato.ts            RegistrarEvento, RegistrarCheckpoint, consultas
│   ├── src/regras.ts              máquina de estados + id canônico (igual ao backend)
│   ├── META-INF/.../indexes/      índice CouchDB para consultas ricas
│   └── testes/                    testes com stub em memória (sem rede)
└── rede/rede.sh                   subir / implantar / parar / retomar / backup / restaurar
```

## Requisitos

Docker (no Windows: Docker Desktop com WSL2 — rode os comandos dentro do WSL), `bash`, `curl`,
`jq` e Node 18+.

## Passo a passo

```bash
cd fabric/rede
./rede.sh instalar     # fabric-samples + binários + imagens (Fabric 2.5.10, CA 1.5.12)
./rede.sh subir        # Org1 + Org2 + orderer Raft + CouchDB + CAs, canal "valida"
./rede.sh implantar    # chaincode com política AND('Org1MSP.peer','Org2MSP.peer')
./rede.sh env          # gera backend/.env.fabric
```

Copie as linhas de `backend/.env.fabric` para `backend/.env`, aplique a migration
`infra/migrations/007_add_fabric_outbox.sql` (já montada no `docker-compose.dev.yml` para bancos
novos) e reinicie o backend. O log deve mostrar `[fabric] sincronizador iniciado`.

> Se o backend roda **em container**, troque `localhost:7051` por `host.docker.internal:7051` e
> monte o diretório `fabric/fabric-samples/test-network/organizations` dentro do container.

## Persistência

| O quê | Onde fica | Como preservar |
| --- | --- | --- |
| Blocos do canal | volumes Docker `peer0.org*.example.com`, `orderer.example.com` | `./rede.sh parar` / `retomar` (não remove volumes) |
| World state | CouchDB (`couchdb0`, `couchdb1`) — derivável dos blocos | idem; incluído no backup |
| Identidades (MSP/TLS) | `fabric-samples/test-network/organizations` | incluído no backup |
| Mensagens ainda não entregues | tabela `fabric_outbox` (PostgreSQL) | backup do banco da aplicação |

```bash
./rede.sh backup                       # para a rede, copia tudo para fabric/backups/, retoma
./rede.sh restaurar fabric/backups/rede-AAAAMMDD-HHMMSS.tar.gz
./rede.sh status                       # containers, altura do canal, último checkpoint
./rede.sh destruir                     # network.sh down — APAGA o ledger (pede confirmação)
```

Se o Fabric ficar fora do ar, a aplicação continua funcionando: os eventos acumulam no outbox e são
entregues em ordem quando a rede volta (veja `GET /api/blockchain/fabric/status`).

## Chaincode

| Função | Tipo | Descrição |
| --- | --- | --- |
| `RegistrarEvento(json)` | submit | Valida id, idempotência, máquina de estados e MSP; grava evento, estado do documento e índice por arquivo |
| `RegistrarCheckpoint(altura, hash)` | submit | Ancora o hash de um bloco da cadeia própria (altura estritamente crescente) |
| `ConsultarDocumento(id)` | query | Estado atual + eventos |
| `HistoricoDocumento(id)` | query | Versões do estado via `GetHistoryForKey` |
| `ConsultarPorArquivo(sha256)` | query | Eventos de um arquivo (chave composta) |
| `ConsultarPorStatus(status)` | query | Consulta rica no CouchDB (usa o índice) |
| `UltimoCheckpoint()` / `ConsultarCheckpoint(altura)` | query | Âncoras registradas |

Erros com prefixo (`TRANSICAO_INVALIDA`, `EVENTO_DUPLICADO`, …) são classificados pelo sincronizador
do backend em confirmado / rejeitado / transitório.

```bash
cd fabric/chaincode/valida-documentos
npm install && npm test
```
