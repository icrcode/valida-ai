#!/usr/bin/env bash
#
# Rede Hyperledger Fabric do Valida AI (baseada na test-network oficial do fabric-samples).
#
#   ./rede.sh instalar     baixa fabric-samples, binários e imagens Docker
#   ./rede.sh subir        2 organizações + orderer Raft + CouchDB + CAs, canal "valida"
#   ./rede.sh implantar    empacota, instala, aprova e confirma o chaincode valida-documentos
#   ./rede.sh env          gera backend/.env.fabric com caminhos de certificados
#   ./rede.sh parar        PARA os containers mantendo ledger e world state (persistência)
#   ./rede.sh retomar      reinicia os containers parados — o ledger continua de onde parou
#   ./rede.sh backup       copia volumes dos peers/orderer, dados do CouchDB e material criptográfico
#   ./rede.sh restaurar <arquivo.tar.gz>
#   ./rede.sh status       containers, altura do canal e último checkpoint
#   ./rede.sh destruir     APAGA tudo (network.sh down) — o ledger é perdido
#
# Requisitos: Docker (Desktop com WSL2 no Windows), bash, curl, jq, Node 18+.
set -euo pipefail

FABRIC_VERSAO="${FABRIC_VERSAO:-2.5.10}"
CA_VERSAO="${CA_VERSAO:-1.5.12}"
CANAL="${CANAL:-valida}"
CHAINCODE="${CHAINCODE:-valida-documentos}"
# Política de endosso: as DUAS organizações precisam executar e assinar cada transação.
POLITICA="${POLITICA:-AND('Org1MSP.peer','Org2MSP.peer')}"

DIR_REDE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR_FABRIC="$(dirname "$DIR_REDE")"
DIR_RAIZ="$(dirname "$DIR_FABRIC")"
DIR_SAMPLES="${DIR_SAMPLES:-$DIR_FABRIC/fabric-samples}"
DIR_TESTNET="$DIR_SAMPLES/test-network"
DIR_BACKUPS="$DIR_FABRIC/backups"
CAMINHO_CC="$DIR_FABRIC/chaincode/$CHAINCODE"

info() { printf '\033[1;34m[rede]\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31m[rede]\033[0m %s\n' "$*" >&2; exit 1; }

exigir_testnet() {
  [[ -x "$DIR_TESTNET/network.sh" ]] || erro "fabric-samples não encontrado. Rode: ./rede.sh instalar"
}

containers_rede() {
  docker ps -a --format '{{.Names}}' | grep -E '(example\.com|couchdb[0-9]|^ca_|dev-peer)' || true
}

volumes_rede() {
  docker volume ls --format '{{.Name}}' | grep -E 'example\.com$' || true
}

cmd_instalar() {
  mkdir -p "$DIR_FABRIC"
  cd "$DIR_FABRIC"
  info "baixando install-fabric.sh (Fabric $FABRIC_VERSAO, CA $CA_VERSAO)"
  curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
  chmod +x install-fabric.sh
  ./install-fabric.sh --fabric-version "$FABRIC_VERSAO" --ca-version "$CA_VERSAO" docker samples binary
  info "instalado em $DIR_SAMPLES"
}

cmd_subir() {
  exigir_testnet
  cd "$DIR_TESTNET"
  info "subindo rede com CouchDB e CAs, canal '$CANAL'"
  ./network.sh up createChannel -c "$CANAL" -ca -s couchdb
}

cmd_implantar() {
  exigir_testnet
  [[ -d "$CAMINHO_CC" ]] || erro "chaincode não encontrado em $CAMINHO_CC"
  cd "$DIR_TESTNET"
  info "implantando $CHAINCODE com política $POLITICA"
  ./network.sh deployCC -c "$CANAL" -ccn "$CHAINCODE" -ccp "$CAMINHO_CC" -ccl typescript -ccep "$POLITICA"
}

cmd_env() {
  exigir_testnet
  local org1="$DIR_TESTNET/organizations/peerOrganizations/org1.example.com"
  local destino="$DIR_RAIZ/backend/.env.fabric"
  cat > "$destino" <<EOF
# Gerado por fabric/rede/rede.sh env — copie estas linhas para backend/.env
FABRIC_HABILITADO=true
FABRIC_CANAL=$CANAL
FABRIC_CHAINCODE=$CHAINCODE
FABRIC_MSP_ID=Org1MSP
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_PEER_HOST_ALIAS=peer0.org1.example.com
FABRIC_TLS_CERT_PATH=$org1/peers/peer0.org1.example.com/tls/ca.crt
FABRIC_CERT_PATH=$org1/users/User1@org1.example.com/msp/signcerts
FABRIC_KEY_PATH=$org1/users/User1@org1.example.com/msp/keystore
FABRIC_INTERVALO_SINCRONIZACAO_MS=5000
FABRIC_CHECKPOINT_A_CADA=10
EOF
  info "variáveis gravadas em $destino"
}

cmd_parar() {
  local lista
  lista="$(containers_rede)"
  [[ -n "$lista" ]] || erro "nenhum container da rede encontrado"
  info "parando containers (ledger e world state ficam preservados nos volumes/containers)"
  # shellcheck disable=SC2086
  docker stop $lista >/dev/null
  info "rede parada. Use './rede.sh retomar' para continuar."
}

cmd_retomar() {
  local lista
  lista="$(containers_rede)"
  [[ -n "$lista" ]] || erro "nenhum container parado encontrado — rode './rede.sh subir'"
  info "retomando: CAs, CouchDB e orderer primeiro, depois os peers"
  # shellcheck disable=SC2046
  docker start $(echo "$lista" | grep -vE '^(peer|dev-peer)') >/dev/null
  sleep 3
  # shellcheck disable=SC2046
  docker start $(echo "$lista" | grep -E '^peer') >/dev/null
  info "rede retomada. O chaincode sobe sob demanda na próxima transação."
}

cmd_backup() {
  exigir_testnet
  local carimbo destino tmp
  carimbo="$(date +%Y%m%d-%H%M%S)"
  tmp="$(mktemp -d)"
  destino="$DIR_BACKUPS/rede-$carimbo.tar.gz"
  mkdir -p "$DIR_BACKUPS" "$tmp/volumes" "$tmp/couchdb"

  info "parando a rede para um snapshot consistente"
  cmd_parar || true

  for v in $(volumes_rede); do
    info "volume $v"
    docker run --rm -v "$v":/origem:ro -v "$tmp/volumes":/destino alpine \
      tar czf "/destino/$v.tar.gz" -C /origem .
  done
  for c in $(docker ps -a --format '{{.Names}}' | grep -E '^couchdb[0-9]+$' || true); do
    info "CouchDB $c"
    docker cp "$c":/opt/couchdb/data "$tmp/couchdb/$c"
  done
  info "material criptográfico (organizations/) e artefatos do canal"
  tar czf "$tmp/organizations.tar.gz" -C "$DIR_TESTNET" organizations channel-artifacts 2>/dev/null || \
    tar czf "$tmp/organizations.tar.gz" -C "$DIR_TESTNET" organizations

  tar czf "$destino" -C "$tmp" .
  rm -rf "$tmp"
  cmd_retomar
  info "backup gravado em $destino"
}

cmd_restaurar() {
  local arquivo="${1:-}"
  [[ -f "$arquivo" ]] || erro "uso: ./rede.sh restaurar <arquivo.tar.gz>"
  exigir_testnet
  local tmp
  tmp="$(mktemp -d)"
  tar xzf "$arquivo" -C "$tmp"

  cmd_parar || true
  for f in "$tmp"/volumes/*.tar.gz; do
    local v
    v="$(basename "$f" .tar.gz)"
    info "restaurando volume $v"
    docker volume create "$v" >/dev/null
    docker run --rm -v "$v":/destino -v "$tmp/volumes":/origem alpine \
      sh -c "rm -rf /destino/* && tar xzf /origem/$v.tar.gz -C /destino"
  done
  for d in "$tmp"/couchdb/*; do
    [[ -d "$d" ]] || continue
    local c
    c="$(basename "$d")"
    info "restaurando CouchDB $c"
    docker cp "$d/." "$c":/opt/couchdb/data
  done
  tar xzf "$tmp/organizations.tar.gz" -C "$DIR_TESTNET"
  rm -rf "$tmp"
  cmd_retomar
}

cmd_status() {
  info "containers:"
  docker ps -a --format 'table {{.Names}}\t{{.Status}}' | grep -E '(NAMES|example\.com|couchdb|^ca_|dev-peer)' || true
  exigir_testnet
  cd "$DIR_TESTNET"
  export PATH="$DIR_SAMPLES/bin:$PATH" FABRIC_CFG_PATH="$DIR_SAMPLES/config"
  # shellcheck disable=SC1091
  source ./scripts/envVar.sh && setGlobals 1
  info "altura do canal '$CANAL':"
  peer channel getinfo -c "$CANAL" || true
  info "último checkpoint da cadeia própria ancorado no Fabric:"
  peer chaincode query -C "$CANAL" -n "$CHAINCODE" -c '{"Args":["UltimoCheckpoint"]}' || true
}

cmd_destruir() {
  exigir_testnet
  read -r -p "Isto APAGA o ledger do Fabric. Faça './rede.sh backup' antes. Continuar? [s/N] " r
  [[ "$r" == "s" || "$r" == "S" ]] || exit 0
  cd "$DIR_TESTNET"
  ./network.sh down
}

case "${1:-}" in
  instalar) cmd_instalar ;;
  subir) cmd_subir ;;
  implantar) cmd_implantar ;;
  env) cmd_env ;;
  parar) cmd_parar ;;
  retomar) cmd_retomar ;;
  backup) cmd_backup ;;
  restaurar) cmd_restaurar "${2:-}" ;;
  status) cmd_status ;;
  destruir) cmd_destruir ;;
  *) sed -n '3,16p' "$0"; exit 1 ;;
esac
