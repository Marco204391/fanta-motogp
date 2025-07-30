#!/bin/bash
# backend/init-db.sh

echo "🏍️  Inizializzazione Database Fanta MotoGP"
echo "========================================="

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Controlla se PostgreSQL è in esecuzione
echo -e "\n${YELLOW}Controllo PostgreSQL...${NC}"
if ! docker ps | grep -q "fantamotogp-db" 2>/dev/null && ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${RED}PostgreSQL non è in esecuzione!${NC}"
    echo "Avvia PostgreSQL con ./start-db.sh prima di continuare."
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL è in esecuzione${NC}"

# Crea .env se non esiste
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}Creazione file .env...${NC}"
    cp .env.example .env
    # Aggiorna automaticamente le credenziali per Docker
    sed -i '' 's|DATABASE_URL=.*|DATABASE_URL="postgresql://fantamotogp:fantamotogp123@localhost:5432/fantamotogp"|' .env
    echo -e "${GREEN}✓ File .env creato e configurato${NC}"
fi

# Applica le migrazioni del database
# Questo comando creerà il database se non esiste e applicherà tutte le migrazioni.
# È il modo più sicuro per assicurarsi che lo schema sia aggiornato.
echo -e "\n${YELLOW}Applico le migrazioni del database...${NC}"
npx prisma migrate dev --name init
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Errore durante l'applicazione delle migrazioni.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Migrazioni applicate con successo${NC}"


# Genera Prisma Client
echo -e "\n${YELLOW}Generazione Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma Client generato${NC}"

# Popola il database con i dati iniziali
echo -e "\n${YELLOW}Popolamento database con dati iniziali (seed)...${NC}"
npx prisma db seed
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Errore durante il popolamento del database.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database popolato${NC}"

echo -e "\n${GREEN}✅ Inizializzazione completata!${NC}"
echo "========================================="
echo -e "Puoi ora avviare il server con: ${YELLOW}npm run dev${NC}"
echo -e "Per esplorare il database usa: ${YELLOW}npx prisma studio${NC}"