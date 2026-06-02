#!/bin/bash
# =================================================================
# Executa UMA ÚNICA VEZ no servidor EC2 para obter o primeiro
# certificado Let's Encrypt e ativar HTTPS.
#
# Pré-requisitos:
#   1. DNS do domínio apontando para o IP deste servidor (EC2)
#   2. Porta 80 liberada no Security Group do EC2
#   3. Variável DOMAIN definida em .env.prod
#   4. Docker e docker compose instalados
#
# Uso:
#   chmod +x infra/init-letsencrypt.sh
#   ./infra/init-letsencrypt.sh seu@email.com
# =================================================================
set -euo pipefail

EMAIL=${1:?"Uso: $0 SEU_EMAIL@DOMINIO.COM"}

# Lê DOMAIN do .env.prod
if [ -f .env.prod ]; then
  export $(grep -E '^DOMAIN=' .env.prod | xargs)
fi

if [ -z "${DOMAIN:-}" ]; then
  echo "❌  Adicione DOMAIN=seu-dominio.com ao arquivo .env.prod"
  exit 1
fi

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Domínio : $DOMAIN"
echo "  E-mail  : $EMAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Cria diretórios locais ──────────────────────────────────────
mkdir -p ./certbot/conf/live/"$DOMAIN"
mkdir -p ./certbot/www

# ── 2. Cria certificado dummy para o nginx subir sem erro ──────────
echo ""
echo "▶ [1/4] Gerando certificado dummy..."
$COMPOSE run --rm --entrypoint "" certbot \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
    -out    "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
    -subj   "/CN=localhost" 2>/dev/null
echo "       ✓ Certificado dummy criado"

# ── 3. Sobe o nginx-proxy com o certificado dummy ─────────────────
echo ""
echo "▶ [2/4] Iniciando nginx-proxy..."
$COMPOSE up -d nginx-proxy
echo "       Aguardando nginx inicializar..."
sleep 5
echo "       ✓ nginx-proxy no ar"

# ── 4. Apaga o dummy e solicita o certificado real ─────────────────
echo ""
echo "▶ [3/4] Solicitando certificado Let's Encrypt (pode demorar ~30s)..."
$COMPOSE run --rm --entrypoint "" certbot sh -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN
  rm -rf /etc/letsencrypt/archive/$DOMAIN
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf
  certbot certonly --webroot -w /var/www/certbot \
    --email '$EMAIL' \
    -d '$DOMAIN' \
    --rsa-key-size 4096 \
    --agree-tos \
    --non-interactive
"
echo "       ✓ Certificado real emitido"

# ── 5. Recarrega nginx com o certificado real ──────────────────────
echo ""
echo "▶ [4/4] Recarregando nginx com o certificado real..."
$COMPOSE exec nginx-proxy nginx -s reload
echo "       ✓ nginx recarregado"

# ── 6. Sobe o restante dos serviços ───────────────────────────────
echo ""
echo "▶ Subindo todos os serviços..."
$COMPOSE up -d
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  HTTPS configurado com sucesso!"
echo "  🌐  https://$DOMAIN"
echo "  🔄  Renovação automática: a cada 12 h"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
