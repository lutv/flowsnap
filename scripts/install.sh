#!/usr/bin/env bash
# ==============================================================================
# FlowSnap Universal Installer & AI Agent Setup
# Installs FlowSnap CLI + UI and registers MCP Server & Skill automatically
# ==============================================================================

set -e

CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m'

echo -e "${CYAN}===========================================================${NC}"
echo -e "${CYAN}   FLOWSNAP — Autonomous UI Action Recorder & SOP Studio   ${NC}"
echo -e "${CYAN}===========================================================${NC}"

# 1. Check Node.js >= 18
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}[ERROR] Node.js tidak ditemukan.${NC} FlowSnap membutuhkan Node.js v18 atau yang lebih baru."
  echo "Silakan install Node.js dari https://nodejs.org atau via NVM / package manager."
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}[ERROR] Versi Node.js ($NODE_VERSION) terlalu lama.${NC} Butuh Node.js v18+."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo -e "\n${CYAN}[1/4] Menginstal dependensi FlowSnap...${NC}"
npm install --omit=dev

# 2. Check & Build UI if missing
if [ ! -d "ui/dist" ]; then
  echo -e "\n${CYAN}[2/4] Melakukan build web studio (UI)...${NC}"
  npm run ui:build
else
  echo -e "\n${GREEN}✔ [2/4] Web studio (ui/dist) sudah siap.${NC}"
fi

# 3. Check Playwright Chromium Browser
echo -e "\n${CYAN}[3/4] Memeriksa browser Playwright Chromium...${NC}"
if ! npx playwright install chromium; then
  echo -e "${YELLOW}⚠ Gagal mengunduh browser Chromium otomatis. Anda dapat menjalankannya nanti dengan: npx playwright install chromium${NC}"
fi

# 4. Link CLI to user binary path (~/.local/bin)
USER_BIN="$HOME/.local/bin"
mkdir -p "$USER_BIN"
ln -sf "$ROOT_DIR/bin/flowsnap.mjs" "$USER_BIN/flowsnap"
ln -sf "$ROOT_DIR/bin/flowsnap-mcp.mjs" "$USER_BIN/flowsnap-mcp"
chmod +x "$ROOT_DIR/bin/flowsnap.mjs" "$ROOT_DIR/bin/flowsnap-mcp.mjs"

# 5. Automatically install MCP Server & Skill into AI coding agents
echo -e "\n${CYAN}[4/4] Mendaftarkan MCP Server & Skill ke AI Coding Agents...${NC}"
node "$ROOT_DIR/bin/flowsnap.mjs" setup-agent --target all

echo -e "${GREEN}===========================================================${NC}"
echo -e "${GREEN}   ✔ INSTALASI FLOWSNAP BERHASIL!                           ${NC}"
echo -e "${GREEN}===========================================================${NC}"
echo -e "Path executable: ${YELLOW}$USER_BIN/flowsnap${NC}"
echo -e "Pastikan ${YELLOW}$USER_BIN${NC} ada di dalam PATH shell Anda.\n"
echo -e "Perintah cepat:"
echo -e "  • Mulai Web Studio UI : ${CYAN}flowsnap start${NC}"
echo -e "  • Buka Studio Desktop  : ${CYAN}npm run desktop:dev${NC}"
echo -e "  • Diagnostik MCP       : ${CYAN}flowsnap validate${NC}"
echo -e "  • Bantuan              : ${CYAN}flowsnap --help${NC}\n"
