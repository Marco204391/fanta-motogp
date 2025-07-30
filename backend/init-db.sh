#!/bin/bash
# backend/init-db.sh

echo "🏍️  Inizializzazione Database Fanta MotoGP"
echo "========================================="

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check se PostgreSQL è in esecuzione
echo -e "\n${YELLOW}Controllo PostgreSQL...${NC}"

# Prima controlla se è in esecuzione tramite Docker
if docker ps | grep -q "fantamotogp-db" 2>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL è in esecuzione (Docker)${NC}"
    PG_RUNNING=true
elif pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL è in esecuzione (locale)${NC}"
    PG_RUNNING=true
else
    echo -e "${RED}PostgreSQL non è in esecuzione!${NC}"
    echo "Avvia PostgreSQL prima di continuare."
    exit 1
fi

# Crea .env se non esiste
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}Creazione file .env...${NC}"
    cp .env.example .env
    # Aggiorna automaticamente le credenziali per Docker
    sed -i '' 's|DATABASE_URL=.*|DATABASE_URL="postgresql://fantamotogp:fantamotogp123@localhost:5432/fantamotogp"|' .env
    echo -e "${GREEN}✓ File .env creato e configurato${NC}"
fi

# Reset database (opzionale)
echo -e "\n${YELLOW}Vuoi resettare il database? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Reset database in corso..."
    npx prisma migrate reset --force
else
    echo "Applicazione migrazioni..."
    npx prisma migrate dev --name init --skip-seed
fi

# Genera Prisma Client
echo -e "\n${YELLOW}Generazione Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma Client generato${NC}"

# Seed database
echo -e "\n${YELLOW}Popolamento database con dati iniziali...${NC}"
npx ts-node prisma/seed.ts
echo -e "${GREEN}✓ Database popolato${NC}"

echo -e "\n${GREEN}✅ Inizializzazione completata!${NC}"
echo "========================================="
echo -e "Puoi ora avviare il server con: ${YELLOW}npm run dev${NC}"
echo -e "Per esplorare il database usa: ${YELLOW}npx prisma studio${NC}"
EOF