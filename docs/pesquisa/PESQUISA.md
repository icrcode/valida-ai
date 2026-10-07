# Busca heurística A* para auditoria e endosso em blockchains de documentos acadêmicos: um estudo com cadeia própria e Hyperledger Fabric

> Documento de pesquisa do fork acadêmico do **Valida AI**. A implementação de referência está em
> `backend/src/pesquisa/` (A*), `backend/src/blockchain/` (cadeia própria e integração) e
> `fabric/` (chaincode e rede Hyperledger Fabric). Os números da seção 7 são reproduzíveis com
> `cd backend && npm run pesquisa:experimentos -- --csv`.

## Resumo

Sistemas de validação de horas complementares emitem certificados cuja autenticidade depende,
tradicionalmente, da confiança no banco de dados da instituição. Este trabalho estende o Valida AI
com duas camadas de registro imutável — uma blockchain própria (hash encadeado, árvore de Merkle,
*proof of work* e assinaturas Ed25519) e uma rede permissionada **Hyperledger Fabric** — e investiga
quatro problemas que surgem dessa arquitetura. Dois deles são formulados como **busca em espaço de
estados e resolvidos com A\***: (P1) a **auditoria de conformidade** do ciclo de vida de cada
documento, via alinhamento de custo mínimo entre o histórico gravado e o processo normativo; e (P2) o
**planejamento de endosso** no Fabric, isto é, a escolha de peers de custo mínimo que satisfaçam a
política de endosso, problema NP-difícil. Os outros dois tratam de **persistência e consistência
entre ledgers** (P3, padrão *transactional outbox*) e da **ancoragem cruzada** da cadeia própria no
Fabric (P4). Experimentos com instâncias sintéticas mostram que o A* com as heurísticas propostas
encontra sempre a solução ótima e expande até **2,6× menos nós** que Dijkstra em P1 e até **8,9×
menos** em P2, enquanto a busca gulosa perde a otimalidade em 80–95% dos casos de P1.

**Palavras-chave:** blockchain; Hyperledger Fabric; busca heurística; A\*; conformance checking;
política de endosso; certificados acadêmicos.

---

## 1. Introdução

A falsificação de diplomas e certificados é um problema recorrente, e o uso de blockchain para
credenciais acadêmicas é discutido desde as primeiras iniciativas na área (Grech & Camilleri, 2017).
A ideia central — registrar a impressão digital (hash) de um documento em um livro-razão difícil de
reescrever — remonta ao *time-stamping* de Haber e Stornetta (1991), que antecede o Bitcoin
(Nakamoto, 2008).

Ao implantar essa ideia em um sistema real surgem perguntas que vão além de "gravar um hash":

* Se o registro é imutável, **como descobrir que algo errado foi gravado** (ex.: um certificado
  emitido sem aprovação) e explicar *o que* está errado?
* Em uma rede permissionada com várias instituições, **quais peers devem endossar** cada transação
  para cumprir a política com o menor custo?
* Com dois ledgers (o banco da aplicação e o Fabric), **como garantir que nada se perde** se um deles
  estiver indisponível?
* Uma cadeia mantida por um único validador **pode ser reescrita** por quem controla a chave e o banco?

### 1.1 Questões de pesquisa

| Id | Questão |
| --- | --- |
| **QP1** | É possível detectar e explicar, com custo mínimo, desvios do processo de validação a partir do histórico gravado na blockchain? Quanto uma heurística admissível reduz o esforço de busca? |
| **QP2** | O A\* é uma abordagem viável para escolher o conjunto ótimo de endossantes no Hyperledger Fabric? Qual o compromisso entre otimalidade e esforço (A\*, Weighted A\*, guloso)? |
| **QP3** | Como manter a cadeia própria e o Fabric consistentes sob falhas, sem perder nem reordenar eventos? |
| **QP4** | A ancoragem periódica da cadeia própria no Fabric elimina o ataque de reescrita por um validador único? Qual a janela de vulnerabilidade residual? |

### 1.2 Contribuições

1. Uma arquitetura de **dupla camada** (cadeia própria + Hyperledger Fabric) com regras de negócio
   aplicadas no endosso (chaincode) e detecção *a posteriori* (auditoria A\*).
2. A formulação da auditoria do ciclo de vida de documentos como **alinhamento ótimo** (inspirado em
   *conformance checking* de *process mining*) com uma heurística admissível composta.
3. A formulação do **planejamento de endosso** como busca em subconjuntos, com prova de
   NP-dificuldade e heurística admissível sensível ao compartilhamento de organizações.
4. Um motor A\* instrumentado e um protocolo experimental reprodutível.

---

## 2. Fundamentação

### 2.1 Blockchain e Hyperledger Fabric

Uma blockchain encadeia blocos pelo hash do anterior; alterar um bloco invalida todos os seguintes.
A árvore de Merkle (Merkle, 1987) resume as transações de um bloco em uma raiz e permite provas de
inclusão de tamanho logarítmico. Assinaturas Ed25519 (Bernstein et al., 2012) identificam o autor de
cada bloco.

O **Hyperledger Fabric** (Androulaki et al., 2018) é uma plataforma permissionada com arquitetura
*execute-order-validate*: (i) o cliente envia a proposta a peers **endossantes**, que simulam o
chaincode e assinam o resultado; (ii) o serviço de ordenação (Raft) ordena as transações em blocos;
(iii) cada peer valida as assinaturas contra a **política de endosso** e conflitos de versão
(MVCC) antes de efetivar no *world state* (LevelDB ou CouchDB). O desempenho do Fabric depende
fortemente do número de endossantes e da latência entre eles (Thakkar, Nathan & Viswanathan, 2018).

### 2.2 Busca A\*

O A\* (Hart, Nilsson & Raphael, 1968) expande nós em ordem de `f(n) = g(n) + h(n)`. Se `h` é
**admissível** (nunca superestima o custo restante), o A\* retorna uma solução ótima; se `h` é
também **consistente**, cada estado é expandido no máximo uma vez. Entre algoritmos que usam a mesma
informação heurística, o A\* é ótimo no número de nós expandidos (Dechter & Pearl, 1985). O
*Weighted A\** (Pohl, 1970) usa `f = g + w·h` e garante custo ≤ `w ·` ótimo. A busca gulosa usa só
`h` e não tem garantia de otimalidade (Russell & Norvig, 2020).

### 2.3 Conformance checking por alinhamentos

Em *process mining* (van der Aalst, 2016), alinhar um traço observado a um modelo de processo
significa encontrar a sequência de movimentos — síncronos, só-no-log ou só-no-modelo — de custo
mínimo. Adriansyah (2014) mostrou que esse problema pode ser resolvido com A\* sobre o produto
síncrono entre traço e modelo.

---

## 3. Arquitetura

```
 evento de domínio ──▶ cadeia própria (PostgreSQL)  ──mesma transação SQL──▶ fabric_outbox
                         │  Merkle + PoW + Ed25519                            │ sincronizador
                         │                                                    ▼ (ordem + backoff)
                         │                                   chaincode valida-documentos
                         │                                   ├─ máquina de estados (recusa fraudes)
                         │                                   ├─ idempotência (EVENTO_DUPLICADO)
                         │                                   └─ RegistrarCheckpoint (âncora)
                         ▼                                                    │
            auditoria A* (P1)  ◀────── traços dos dois ledgers ───────────────┘
            planejamento de endosso A* (P2)
```

| Camada | Garante | Como |
| --- | --- | --- |
| Cadeia própria | Evidência de adulteração | Hash encadeado, Merkle, PoW, Ed25519, triggers append-only |
| Hyperledger Fabric | Prevenção + replicação entre organizações | Política `AND(Org1, Org2)`, máquina de estados no chaincode, ledger em volumes + CouchDB |
| Outbox (P3) | Nenhum evento perdido ou reordenado | Gravação atômica + entrega ordenada + idempotência |
| Checkpoints (P4) | Cadeia própria não pode ser reescrita sem divergir do Fabric | `RegistrarCheckpoint(altura, hash)` a cada N blocos |
| Auditoria A\* (P1) | Explicação mínima das anomalias | Alinhamento ótimo traço × modelo |

---

## 4. Problema P1 — Auditoria de conformidade com A\*

### 4.1 Modelo normativo

O ciclo de vida de um documento é o autômato `M = (Q, Σ, δ, q0, F)`:

```
INICIO ──SUBMETIDO──▶ PENDENTE ──APROVADO──▶ APROVADO ──CERTIFICADO──▶ CERTIFICADO ●
                         │  │ └──REPROVADO──▶ REPROVADO ●
                         │  └────CANCELADO──▶ CANCELADO ●
                         └──REVISAO──▶ EM_REVISAO ⟲REVISAO ──APROVADO/REPROVADO──▶ …
```

`F = {CERTIFICADO, REPROVADO, CANCELADO}` no modo *completo*; no modo *prefixo* todo estado é final
(documentos em andamento são aceitos).

> **Achado durante a modelagem.** O backend original permite aprovar/reprovar um documento em
> qualquer status diferente de `cancelado` (`modulos/validacao/repositorio.ts`). Logo, aprovações
> duplicadas ou reprovação após aprovação são possíveis na cadeia própria. O chaincode do Fabric
> recusa essas transições; a auditoria A\* as detecta na cadeia própria.

### 4.2 Formulação como busca

Dado o traço `σ = ⟨e1,…,en⟩` lido da blockchain:

* **Estado:** `(i, q)` — `i` eventos consumidos, `q ∈ Q` estado do modelo.
* **Inicial:** `(0, q0)`. **Objetivo:** `i = n ∧ q ∈ F`.
* **Ações:**
  * síncrona `(i, q) → (i+1, δ(q, e_{i+1}))` se definida — custo 0;
  * só-traço `(i, q) → (i+1, q)` — custo `c_L = 1` (evento **indevido**);
  * só-modelo `(i, q) → (i, δ(q, a))` para cada `a` — custo `c_M = 1` (evento **ausente**).

O custo do alinhamento ótimo é a menor quantidade de desvios que explica o traço; a **aptidão**
é `1 − custo / (|σ|·c_L + passos_modelo·c_M)`.

### 4.3 Heurística e admissibilidade

Seja `r = n − i` o número de eventos restantes, `d(q)` a menor distância (em transições) de `q` a
`F`, e `U(i, q)` o número de eventos restantes cujo rótulo **não é alcançável** a partir de `q`.

`h(i, q) = max( c_M · max(0, d(q) − r) ,  c_L · U(i, q) )`

**Proposição 1.** `h` é admissível.

*Prova.* Seja `π` um alinhamento ótimo do sufixo a partir de `(i, q)`, com `s` movimentos síncronos,
`ℓ` só-traço e `m` só-modelo. O caminho no modelo tem `s + m ≥ d(q)` passos e o traço restante tem
`s + ℓ = r` eventos. (a) Como `s ≤ r`, temos `m ≥ d(q) − r`, logo `custo(π) ≥ c_M·max(0, d(q) − r)`.
(b) Um evento com rótulo inalcançável a partir de `q` nunca pode ser síncrono (nenhum estado
alcançável o aceita), então cada um é só-traço: `ℓ ≥ U(i, q)` e `custo(π) ≥ c_L·U(i, q)`. O máximo
de duas cotas inferiores é cota inferior. ∎

`h` não é necessariamente consistente; por isso o motor (`astar.ts`) **reabre** estados quando
encontra um `g` menor, preservando a otimalidade (a métrica `reaberturas` registra quantas vezes).

### 4.4 Uso no sistema

* `GET /api/blockchain/conformidade` — audita todos os documentos da cadeia.
* `GET /api/blockchain/conformidade/:id` — audita um documento **nos dois ledgers** e reconcilia
  as divergências com o estado do outbox (ex.: "só na cadeia própria — rejeitado: TRANSICAO_INVALIDA").
* Página `/blockchain` → painel "Auditoria de conformidade (busca A\*)".

---

## 5. Problema P2 — Planejamento de endosso no Fabric com A\*

### 5.1 Definição

Dada uma política de endosso `P` (sintaxe do Fabric: `AND`, `OR`, `OutOf(k, …)` sobre principais
`'OrgMSP.peer'`) e um conjunto de peers, cada um com organização `o(p)` e custo

`c(p) = latência + α·(altura_max − altura(p)) + β·fila(p)`

(peers com atraso de altura acima de um limite são descartados, pois endossariam sobre estado velho
e causariam `MVCC_READ_CONFLICT`), encontrar o conjunto de organizações `S` com `P(S) = verdadeiro`
minimizando `Σ_{o∈S} min_{p: o(p)=o} c(p)`.

**Proposição 2.** O problema é NP-difícil.

*Prova (redução).* Dada uma instância de *hitting set* ponderado — universo `U` com pesos e família
de subconjuntos `C1,…,Cm` — construa uma organização por elemento de `U` com um peer de custo igual
ao peso, e a política `AND(OR(C1), …, OR(Cm))`. Um conjunto de organizações satisfaz a política se e
somente se intercepta todo `Cj`, e os custos coincidem. Como *hitting set* é NP-completo (Karp, 1972),
o problema de endosso é NP-difícil. ∎

### 5.2 Formulação como busca

* **Estado:** subconjunto `S` de organizações (bitmask).
* **Ações:** acrescentar uma organização com índice maior que o maior índice em `S` (quebra de
  simetria: cada subconjunto é gerado uma única vez) — custo = custo do melhor peer dela.
* **Objetivo:** `P(S) = verdadeiro`.

### 5.3 Heurística

`h(S) = h_P(S)`, definida recursivamente sobre a árvore da política:

| Nó | `h` |
| --- | --- |
| folha `o` | `0` se `o ∈ S`; senão `custo(o)` |
| `OR(f1..fk)` | `min h(fi)` |
| `AND(f1..fk)` | `Σ h(fi)` se os filhos têm conjuntos de organizações **disjuntos**; senão `max h(fi)` |
| `OutOf(k, f1..fm)` | soma dos `k` menores se disjuntos; senão o `k`-ésimo menor |

**Proposição 3.** `h` é admissível.

*Esboço.* Por indução na estrutura. Folhas: exato. `OR`: qualquer solução satisfaz algum filho, cujo
custo restante é ≥ seu `h`. `AND` disjunto: as organizações que satisfazem cada filho são distintas,
então os custos somam. `AND` com compartilhamento: somar poderia contar a mesma organização duas vezes
(superestimar); o máximo continua sendo cota inferior, pois todos os filhos precisam ser satisfeitos.
`OutOf`: ao menos `k` filhos são satisfeitos; sem compartilhamento o custo é ≥ soma dos `k` menores;
com compartilhamento, ≥ o maior entre eles ≥ o `k`-ésimo menor. ∎

### 5.4 Relação com o Fabric real

O Fabric Gateway (≥ 2.4) já escolhe endossantes por altura de bloco e disponibilidade, mas não
minimiza um custo composto nem expõe a escolha. `POST /api/blockchain/pesquisa/endosso` permite
estudar o planejamento offline; integrá-lo ao Gateway (por exemplo via *endorsing organizations*
explícitas na proposta) é trabalho futuro.

---

## 6. Problemas P3 e P4 — Persistência e ancoragem

### 6.1 P3: consistência entre a cadeia própria e o Fabric

Gravar no PostgreSQL e depois chamar o Fabric é um problema de **escrita dupla**: se o processo cair
entre as duas operações, os ledgers divergem. A solução adotada é o padrão *transactional outbox*
(Richardson, 2018):

1. O bloco e as mensagens para o Fabric (`fabric_outbox`) são gravados **na mesma transação SQL**.
2. O sincronizador entrega as mensagens **em ordem de criação**; numa falha transitória o lote para
   (*head-of-line blocking*), pois enviar o evento seguinte de um documento antes do anterior seria
   recusado pela máquina de estados do chaincode.
3. A entrega é *at-least-once*; a idempotência do chaincode (`EVENTO_DUPLICADO` ⇒ confirmado) torna
   o efeito *exactly-once*.
4. Rejeições de regra (`TRANSICAO_INVALIDA`) são **permanentes** e ficam registradas como evidência
   (`GET /api/blockchain/fabric/rejeitadas`).

**Propriedades:** (segurança) nenhum evento chega ao Fabric fora da ordem causal de seu documento;
(vivacidade) se o Fabric fica disponível por tempo suficiente, toda mensagem pendente é confirmada ou
rejeitada. O *backoff* exponencial (2ⁿ s, máx. 5 min) evita sobrecarregar a rede durante falhas.

**Persistência do ledger Fabric.** Os blocos ficam nos volumes Docker dos peers e do orderer
(`/var/hyperledger/production`); o *world state* fica no CouchDB, que pode ser reconstruído a partir
dos blocos. `fabric/rede/rede.sh parar|retomar` preserva tudo; `backup|restaurar` copia volumes,
dados do CouchDB e o material criptográfico. A cadeia própria persiste no PostgreSQL com triggers
*append-only*.

### 6.2 P4: ancoragem cruzada

Com um único validador, quem detém a chave Ed25519 **e** acesso ao banco pode reconstruir toda a
cadeia própria com PoW válido. A cada `N` blocos (`FABRIC_CHECKPOINT_A_CADA`), o hash do bloco é
gravado no Fabric via `RegistrarCheckpoint`, que exige altura estritamente crescente. A partir daí,
reescrever qualquer bloco ≤ checkpoint faria `checkpointConfere = false` em
`/api/blockchain/fabric/status`.

**Janela residual:** os até `N − 1` blocos após o último checkpoint, mais a latência do outbox.
Reduzir `N` diminui a janela ao custo de mais transações no Fabric — um compromisso a ser medido
experimentalmente (trabalho futuro com a rede ativa).

---

## 7. Avaliação experimental

### 7.1 Protocolo

* **Implementação:** TypeScript; motor A\* com heap binário (`backend/src/pesquisa/astar.ts`).
* **Estratégias:** Dijkstra (`h = 0`), A\*, Weighted A\* (`w = 2`), guloso (`f = h`).
* **Métricas:** nós expandidos, tempo médio (ms), custo e % de soluções ótimas.
* **Reprodutibilidade:** gerador de Park–Miller com sementes fixas (2026 para E1, 1968 para E2).
* **Validação de corretude:** testes automatizados comparam A\* com força bruta (P2) e com Dijkstra
  (P1) em instâncias aleatórias (`backend/testes/unitarios/pesquisa/astar.test.ts`).

**E1 (P1):** traços gerados por passeio aleatório no modelo, com ruído — cada evento, com
probabilidade *ρ*, é removido (falha de sincronização), duplicado (reenvio) ou trocado (erro/fraude).
40 traços por configuração.

**E2 (P2):** redes com 6 a 22 organizações, 1–3 peers por organização, latência 5–125 ms, atraso de
0–3 blocos, fila 0–9; política `AND` de ⌈n/2⌉ cláusulas `OR` (densidade 0,25) mais uma `OutOf(2, …)`.
25 redes por configuração.

### 7.2 Resultados — E1 (conformidade)

Recorte com ruído *ρ* = 0,3 (tabela completa em `resultados/e1-conformidade.csv`):

| Traço (médio) | Estratégia | Nós expandidos | Custo médio | % ótimo |
| --- | --- | --- | --- | --- |
| 8,4 | Dijkstra | 22,9 | 1,13 | 100 |
| 8,4 | **A\*** | **10,8** | 1,13 | **100** |
| 8,4 | Weighted A\* | 10,8 | 1,15 | 98 |
| 8,4 | Guloso | 18,1 | 8,07 | 20 |
| 12,8 | Dijkstra | 36,9 | 1,32 | 100 |
| 12,8 | **A\*** | **15,8** | 1,32 | **100** |
| 12,8 | Weighted A\* | 15,9 | 1,32 | 100 |
| 12,8 | Guloso | 15,5 | 12,30 | 10 |
| 13,5 | Dijkstra | 47,3 | 2,08 | 100 |
| 13,5 | **A\*** | **18,2** | 2,08 | **100** |
| 13,5 | Weighted A\* | 18,8 | 2,10 | 98 |
| 13,5 | Guloso | 25,1 | 13,03 | 10 |

Sem ruído (*ρ* = 0), A\* e Dijkstra expandem o mesmo número de nós: o caminho síncrono de custo 0 é
encontrado diretamente e a heurística não tem o que podar. O ganho do A\* aparece justamente quando
há anomalias — o caso de interesse para auditoria — e cresce com o tamanho do traço (1,5× a 2,6×).

### 7.3 Resultados — E2 (endosso)

| Orgs | Estratégia | Nós expandidos | Tempo (ms) | Custo / ótimo (médio) | Pior razão |
| --- | --- | --- | --- | --- | --- |
| 6 | Dijkstra | 12,3 | 0,06 | 1,000 | 1,000 |
| 6 | **A\*** | **6,8** | 0,10 | 1,000 | 1,000 |
| 14 | Dijkstra | 619,0 | 1,67 | 1,000 | 1,000 |
| 14 | **A\*** | **139,1** | 2,19 | 1,000 | 1,000 |
| 14 | Weighted A\* | 63,5 | 1,13 | 1,055 | 1,333 |
| 14 | Guloso | 184,9 | 1,62 | 1,517 | 2,214 |
| 22 | Dijkstra | 2148,7 | 18,67 | 1,000 | 1,000 |
| 22 | **A\*** | **242,6** | 14,17 | 1,000 | 1,000 |
| 22 | Weighted A\* | 93,0 | 5,84 | 1,054 | 1,319 |
| 22 | Guloso | 2739,2 | 63,51 | 2,368 | 4,148 |

### 7.4 Discussão

* **QP1.** A auditoria A\* encontra sempre o alinhamento ótimo e explica as anomalias em termos do
  processo ("aprovação esperada no estado PENDENTE não foi registrada"). A heurística reduz a
  expansão em até 2,6× nos traços ruidosos. Em instâncias pequenas o custo de calcular `h` faz o
  tempo absoluto do A\* ficar próximo ou acima do Dijkstra — a vantagem é em nós expandidos.
* **QP2.** O A\* é ótimo em todas as 125 redes e expande 8,9× menos nós que Dijkstra com 22
  organizações; o tempo cresce mais devagar (14 ms vs 19 ms). O Weighted A\* é o melhor compromisso
  quando ~5% acima do ótimo é aceitável (≈2,4× mais rápido que A\*). A busca gulosa é a pior opção:
  sem `g` ela explora mais e fica até 4,1× acima do ótimo.
* **QP3/QP4.** Atendidas por construção (seções 6.1 e 6.2) e verificadas por testes unitários do
  sincronizador e do chaincode; a medição em rede real (latência do outbox, custo do checkpoint em
  função de `N`) fica para trabalho futuro.

### 7.5 Ameaças à validade

* **Dados sintéticos.** Traços e redes são gerados; distribuições reais podem diferir. O modelo de
  processo absorve rapidamente os traços (o estado final é atingido cedo), então o tamanho médio real
  ficou abaixo do alvo nas configurações de 40 e 80 eventos (12,8 e 13,5).
* **Custo de endosso aditivo.** Modelamos o custo como soma; o tempo de endosso real é próximo do
  *máximo* das latências (requisições em paralelo). O custo aditivo representa carga total na rede.
* **Medições de tempo** em um único processo Node.js, sem isolamento de CPU; por isso destacamos nós
  expandidos como métrica principal.
* **Fabric não exercitado ao vivo** nos experimentos: o chaincode foi testado com um *stub* em
  memória e a rede deve ser validada com `fabric/rede/rede.sh`.

---

## 8. Trabalhos futuros

1. Medir P3/P4 na rede Fabric real (latência ponta a ponta, vazão, custo de checkpoints).
2. Integrar o planejador A\* ao Fabric Gateway e comparar com a seleção nativa.
3. Custos de alinhamento aprendidos (ex.: remoção de evento mais barata que fraude), e modelos de
   processo com concorrência (redes de Petri), como em Adriansyah (2014).
4. Heurísticas mais fortes para P2 (relaxação linear do *hitting set*) e busca anytime
   (ARA\*) para redes com muitas organizações.
5. Privacidade: *private data collections* do Fabric para os metadados do documento.

---

## Referências

ADRIANSYAH, A. **Aligning observed and modeled behavior**. 2014. Tese (Doutorado) — Technische
Universiteit Eindhoven, Eindhoven, 2014.

ANDROULAKI, E. et al. Hyperledger Fabric: a distributed operating system for permissioned
blockchains. In: **EUROSYS CONFERENCE**, 13., 2018, Porto. *Proceedings…* New York: ACM, 2018.

BERNSTEIN, D. J. et al. High-speed high-security signatures. **Journal of Cryptographic
Engineering**, v. 2, n. 2, p. 77–89, 2012.

DECHTER, R.; PEARL, J. Generalized best-first search strategies and the optimality of A\*.
**Journal of the ACM**, v. 32, n. 3, p. 505–536, 1985.

GRECH, A.; CAMILLERI, A. F. **Blockchain in education**. Luxembourg: Publications Office of the
European Union, 2017. (JRC Science for Policy Report, EUR 28778 EN).

HABER, S.; STORNETTA, W. S. How to time-stamp a digital document. **Journal of Cryptology**, v. 3,
n. 2, p. 99–111, 1991.

HART, P. E.; NILSSON, N. J.; RAPHAEL, B. A formal basis for the heuristic determination of minimum
cost paths. **IEEE Transactions on Systems Science and Cybernetics**, v. 4, n. 2, p. 100–107, 1968.

KARP, R. M. Reducibility among combinatorial problems. In: MILLER, R. E.; THATCHER, J. W. (ed.).
**Complexity of computer computations**. New York: Plenum, 1972. p. 85–103.

MERKLE, R. C. A digital signature based on a conventional encryption function. In: **CRYPTO '87**.
Berlin: Springer, 1988. (Lecture Notes in Computer Science, v. 293). p. 369–378.

NAKAMOTO, S. **Bitcoin**: a peer-to-peer electronic cash system. 2008.

POHL, I. Heuristic search viewed as path finding in a graph. **Artificial Intelligence**, v. 1,
n. 3–4, p. 193–204, 1970.

RICHARDSON, C. **Microservices patterns**. Shelter Island: Manning, 2018.

RUSSELL, S.; NORVIG, P. **Artificial intelligence**: a modern approach. 4. ed. Hoboken: Pearson,
2020.

THAKKAR, P.; NATHAN, S.; VISWANATHAN, B. Performance benchmarking and optimizing Hyperledger Fabric
blockchain platform. In: **IEEE MASCOTS**, 26., 2018, Milwaukee. *Proceedings…* IEEE, 2018.

VAN DER AALST, W. M. P. **Process mining**: data science in action. 2. ed. Berlin: Springer, 2016.
