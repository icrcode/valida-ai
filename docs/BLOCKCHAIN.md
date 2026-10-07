# Blockchain de Documentos — Valida AI

> Extensão acadêmica do Valida AI: todo o ciclo de vida de um documento (submissão, decisão do
> coordenador, emissão de certificado) é gravado em uma **blockchain permissionada**, tornando o
> histórico **imutável, auditável e verificável publicamente**.

## 1. Motivação

No Valida AI original, a autenticidade de um certificado depende de confiar no banco de dados: um
administrador com acesso ao PostgreSQL poderia alterar `documentos.status`, apagar uma linha de
`historico_validacoes` ou trocar o PDF no bucket, e ninguém perceberia.

A blockchain resolve isso com **evidência criptográfica**: qualquer alteração no histórico quebra
hashes e assinaturas, e a auditoria (`GET /api/blockchain/validar`) aponta exatamente o bloco
adulterado.

## 2. Arquitetura

```
 Estudante/Coordenador
        │  (HTTP)
        ▼
 rotas de documentos/validação ──emite──▶ barramento de eventos
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         ▼                     ▼                     ▼
                 handlers existentes    blockchain/handlers.ts   gerador de certificado
                 (notificações, PDF)            │                      │ emite certificado_emitido
                                                ▼                      │
                                   servico.ts: fila de transações ◀────┘
                                                │  (advisory lock no Postgres)
                                                ▼
                         cadeia.ts: Merkle → Proof of Work → assinatura Ed25519
                                                │
                                                ▼
                         blockchain_blocos (jsonb, append-only) + blockchain_transacoes (índice)
```

| Arquivo | Responsabilidade |
| --- | --- |
| `backend/src/blockchain/criptografia.ts` | SHA-256, JSON canônico, chaves e assinaturas Ed25519 |
| `backend/src/blockchain/merkle.ts` | Árvore de Merkle, provas de inclusão |
| `backend/src/blockchain/cadeia.ts` | Transações, blocos, mineração, validação (funções puras) |
| `backend/src/blockchain/repositorio.ts` | Persistência no PostgreSQL |
| `backend/src/blockchain/servico.ts` | Fila de mineração, chave do validador, provas, auditoria |
| `backend/src/blockchain/handlers.ts` | Converte eventos de domínio em transações |
| `backend/src/blockchain/rotas.ts` | API pública do explorador |
| `infra/migrations/006_add_blockchain.sql` | Tabelas + triggers de imutabilidade |
| `frontend/src/pages/Blockchain.tsx` | Explorador web (`/blockchain`) |

## 3. Estruturas de dados

### Transação

```jsonc
{
  "id": "sha256(conteúdo canônico)",
  "tipo": "DOCUMENTO_SUBMETIDO",       // ou APROVADO, REPROVADO, REVISAO_SOLICITADA, CANCELADO, CERTIFICADO_EMITIDO
  "documentoId": "uuid",
  "hashArquivo": "sha256 do PDF",       // impressão digital do arquivo
  "dados": { "avaliador": "sha256(id do coordenador)", "hashObservacoes": "..." },
  "timestamp": "2026-10-07T12:00:00.000Z",
  "sal": "8 bytes aleatórios"
}
```

### Bloco

```jsonc
{
  "altura": 42,
  "timestamp": "...",
  "hashAnterior": "00a1…",   // encadeamento
  "raizMerkle": "…",         // resumo de todas as transações
  "dificuldade": 3,
  "nonce": 1873,              // encontrado pela mineração
  "validador": "chave pública Ed25519 (base64)",
  "hash": "000f…",           // sha256 do cabeçalho
  "assinatura": "Ed25519(hash)",
  "transacoes": [ … ]
}
```

O bloco **0 (gênese)** registra a lista de validadores autorizados.

## 4. Camadas de segurança

| Camada | O que garante | Ataque que impede |
| --- | --- | --- |
| **Hash SHA-256 do PDF** | Identidade do arquivo | Trocar o PDF no bucket por outro |
| **Id da transação = hash do conteúdo** | Integridade da transação | Editar o tipo/data/hash de um evento |
| **Árvore de Merkle** | Integridade do conjunto de transações | Inserir, remover ou reordenar transações |
| **Encadeamento (`hashAnterior`)** | Ordem e completude do histórico | Remover/alterar um bloco antigo |
| **Proof of Work** | Custo computacional para reescrever | Recalcular a cadeia em massa |
| **Assinatura Ed25519 (Proof of Authority)** | Autoria do bloco | Forjar blocos sem a chave privada do validador |
| **Âncoras externas** (`BLOCKCHAIN_HASH_GENESE`, `BLOCKCHAIN_VALIDADORES_CONFIAVEIS`) | A cadeia é *a* cadeia esperada | Recriar uma cadeia inteira do zero com outra chave |
| **Triggers append-only no Postgres** | Bloqueia `UPDATE`/`DELETE`/`TRUNCATE` | Alteração acidental ou via aplicação |
| **Advisory lock** | Um minerador por vez | Dois blocos com a mesma altura (fork local) |

### Privacidade (LGPD)

A cadeia é pública para leitura, por isso **não grava dados pessoais em claro**: apenas ids de
documentos, hashes de arquivos e *hashes* de identificadores (avaliador, curso, observações). Um hash
permite **provar** um dado a quem já o conhece, sem **revelá-lo** a quem não conhece.

## 5. Por que uma blockchain *permissionada* e não Ethereum?

| Critério | Pública (Ethereum/Polygon) | Permissionada (esta implementação) |
| --- | --- | --- |
| Custo por registro | taxa (gas) | zero |
| Quem escreve | qualquer um | só validadores autorizados (a instituição) |
| Descentralização | alta | baixa — confiança na instituição + auditoria pública |
| Complexidade | carteira, RPC, contrato | código TypeScript ~600 linhas |
| Valor didático | usa uma caixa-preta | todos os conceitos implementados e testáveis |

**Limitação honesta:** com um único validador, quem controla a chave privada *e* o banco poderia
reescrever tudo. Mitigações previstas (trabalhos futuros):

1. **Âncora externa** — publicar periodicamente o hash do último bloco em uma blockchain pública
   (uma transação em Polygon/Bitcoin via OP_RETURN) ou em um serviço de timestamp (RFC 3161 /
   OpenTimestamps). Assim, nem a própria instituição consegue reescrever o passado.
2. **Múltiplos validadores** — várias instituições/coordenações assinando blocos (consenso tipo
   PBFT ou round-robin entre as chaves listadas no gênese).
3. **Réplicas independentes** — outros nós baixam os blocos via API e revalidam a cadeia.

## 6. API

Todas as rotas são públicas e somente leitura.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/blockchain/status` | Altura, último hash, hash do gênese, dificuldade, validadores |
| GET | `/api/blockchain/validar` | Auditoria completa: recalcula hashes, Merkle, PoW e assinaturas |
| GET | `/api/blockchain/blocos?pagina=&limite=` | Blocos mais recentes |
| GET | `/api/blockchain/blocos/:alturaOuHash` | Um bloco completo |
| GET | `/api/blockchain/transacoes/:id` | Transação + prova de Merkle |
| GET | `/api/blockchain/documentos/:documentoId` | Linha do tempo imutável do documento |
| GET | `/api/blockchain/arquivos/:sha256` | O arquivo com esse hash está registrado? |
| POST | `/api/blockchain/verificar-arquivo` | Upload de PDF (`arquivo`) → hash → busca na cadeia |

A rota existente `GET /api/publica/verificar/:hash` agora também devolve um campo `blockchain`
com `ancorado: true/false` e a linha do tempo do documento.

## 7. Como rodar

1. Banco novo: o `docker-compose.dev.yml` já monta `006_add_blockchain.sql` no init do Postgres.
   Banco existente: `psql -f infra/migrations/006_add_blockchain.sql`.
2. Variáveis (opcionais) em `backend/.env`:

   ```env
   BLOCKCHAIN_DIFICULDADE=3
   BLOCKCHAIN_CHAVE_PRIVADA=           # PEM; se vazio, gera em .blockchain/validador.pem
   BLOCKCHAIN_ARQUIVO_CHAVE=.blockchain/validador.pem
   BLOCKCHAIN_VALIDADORES_CONFIAVEIS=  # chaves públicas base64, separadas por vírgula
   BLOCKCHAIN_HASH_GENESE=             # fixe após o primeiro start
   ```

   > Em produção/Docker defina `BLOCKCHAIN_CHAVE_PRIVADA`: o arquivo gerado some ao recriar o
   > container e, com outra chave, os novos blocos seriam rejeitados como "validador não autorizado".

   Gerar uma chave: `node -e "console.log(require('crypto').generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}))"`

3. Suba a aplicação normalmente. No log aparece `bloco gênese criado` e
   `integridade OK | N blocos verificados`.
4. Acesse `http://localhost:5173/blockchain`.

## 8. Roteiro de demonstração (para a apresentação)

1. Estudante submete um PDF → no explorador surge um bloco com `DOCUMENTO_SUBMETIDO`.
2. Coordenador aprova → novos blocos `DOCUMENTO_APROVADO` e `CERTIFICADO_EMITIDO`.
3. Na página `/verificar/:hash` do certificado aparece "⛓ Registrado na blockchain".
4. Em `/blockchain`, selecione o PDF original → "✓ Arquivo autêntico". Edite 1 byte do PDF e
   verifique de novo → "✗ Nenhum registro encontrado".
5. **Ataque simulado** no banco (como superusuário):

   ```sql
   ALTER TABLE blockchain_blocos DISABLE TRIGGER trg_blockchain_blocos_imutavel;
   UPDATE blockchain_blocos
      SET conteudo = jsonb_set(conteudo, '{transacoes,0,tipo}', '"DOCUMENTO_APROVADO"')
    WHERE altura = 1;
   ALTER TABLE blockchain_blocos ENABLE TRIGGER trg_blockchain_blocos_imutavel;
   ```

   Clique em **Auditar integridade** → "✗ Adulteração detectada: bloco #1: transação … foi
   adulterada". (Sem desabilitar o trigger, o próprio `UPDATE` já é recusado.)

## 9. Extensão: Hyperledger Fabric e pesquisa com A*

A cadeia própria agora é replicada em uma rede **Hyperledger Fabric** (chaincode com máquina de
estados, política de endosso `AND(Org1, Org2)`, CouchDB) por meio de um *transactional outbox*
persistido no PostgreSQL, e é ancorada no Fabric por checkpoints periódicos. Também foram
adicionados dois problemas de busca resolvidos com **A\***: auditoria de conformidade do ciclo de
vida e planejamento de endosso.

* Como subir a rede e a persistência do ledger: [fabric/README.md](../fabric/README.md)
* Artigo/relatório de pesquisa: [docs/pesquisa/PESQUISA.md](pesquisa/PESQUISA.md)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/blockchain/fabric/status` | Conexão, fila do outbox, último checkpoint e se confere |
| GET | `/api/blockchain/fabric/documentos/:id` | Registro do documento no ledger do Fabric |
| GET | `/api/blockchain/fabric/rejeitadas` | Eventos recusados pelo chaincode |
| GET | `/api/blockchain/conformidade?modo=&estrategia=` | Auditoria A\* de todos os documentos |
| GET | `/api/blockchain/conformidade/:id` | Auditoria nos dois ledgers + reconciliação |
| POST | `/api/blockchain/pesquisa/endosso` | Planejamento ótimo de endosso (A\*) |

## 10. Testes

```bash
cd backend
npx jest testes/unitarios/blockchain testes/unitarios/pesquisa testes/rotas/blockchain.test.ts testes/rotas/publica.test.ts
npm run pesquisa:experimentos      # tabelas da pesquisa (A* × Dijkstra × Weighted × guloso)
```

Os testes de `cadeia.test.ts` simulam cada ataque da tabela da seção 4 (alterar hash de arquivo,
forjar transação, remover bloco, bloco de validador intruso, assinatura e PoW inválidos) e
verificam que a validação os detecta.
