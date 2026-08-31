#!/bin/bash
# ============================================================
# FineX OS — Setup Script
# ============================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        FineX OS — Setup Script       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js nuk është instaluar!${NC}"
    echo -e "  Shko te: https://nodejs.org dhe instalo versionin LTS"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} i gjetur${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm nuk është instaluar!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm i gjetur${NC}"

# Install dependencies
echo ""
echo -e "${BLUE}▶ Duke instaluar paketat (npm install)...${NC}"
npm install --silent
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Gabim gjatë instalimit të paketave${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Paketat u instaluan${NC}"

# Check for .env.local
echo ""
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠ Fajlli .env.local nuk ekziston — po e krijoj...${NC}"
    cp .env.example .env.local
    echo -e "${GREEN}✓ .env.local u krijua nga .env.example${NC}"
    echo ""
    echo -e "${BOLD}TANI DUHET TI PLOTËSOSH VLERAT NË .env.local:${NC}"
    echo -e "  ${YELLOW}NEXT_PUBLIC_SUPABASE_URL${NC}     → nga supabase.com/project/settings/api"
    echo -e "  ${YELLOW}NEXT_PUBLIC_SUPABASE_ANON_KEY${NC} → nga supabase.com/project/settings/api"
    echo -e "  ${YELLOW}SUPABASE_SERVICE_ROLE_KEY${NC}    → nga supabase.com/project/settings/api"
    echo -e "  ${YELLOW}OPENAI_API_KEY${NC}               → nga platform.openai.com/api-keys"
    echo ""
    echo -e "Pas plotësimit të .env.local, ekzekuto: ${BOLD}./setup.sh${NC} përsëri"
    exit 0
fi

# Validate .env.local has values
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
if [[ "$SUPABASE_URL" == *"your-project"* ]] || [[ -z "$SUPABASE_URL" ]]; then
    echo -e "${RED}✗ .env.local nuk është plotësuar!${NC}"
    echo -e "  Hap fajllin .env.local dhe plotëso vlerat nga Supabase"
    exit 1
fi
echo -e "${GREEN}✓ .env.local është konfiguruar${NC}"

# Success - ready to start
echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║           Sistemi është gati!        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Hapat e fundit (bëji manualisht):${NC}"
echo ""
echo -e "  ${BOLD}1.${NC} Supabase SQL Editor → ekzekuto:"
echo -e "     • supabase/schema.sql"
echo -e "     • supabase/rls-policies.sql"
echo -e "     • supabase/seed.sql"
echo ""
echo -e "  ${BOLD}2.${NC} Supabase Storage → krijo buckets:"
echo -e "     • receipts (public)"
echo -e "     • logos (public)"
echo -e "     • ai-scans (private)"
echo ""
echo -e "  ${BOLD}3.${NC} Nis serverin:"
echo -e "     ${BOLD}npm run dev${NC}"
echo ""
echo -e "  ${BOLD}4.${NC} Regjistrohu te: http://localhost:3000/register"
echo ""
echo -e "  ${BOLD}5.${NC} Bëhu admin (në Supabase SQL Editor):"
echo -e "     ${YELLOW}UPDATE users SET role = 'admin' WHERE email = 'emailijot@domain.com';${NC}"
echo ""
echo -e "  ${BOLD}6.${NC} Hap Admin Panelin: http://localhost:3000/admin"
echo ""
