#!/bin/bash
# start-db.sh

echo "🐘 Avvio PostgreSQL per Fanta MotoGP"
echo "===================================="

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Controlla se Docker è installato
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker non è installato!${NC}"
    echo "Installa Docker da: https://docs.docker.com/get-docker/"
    exit 1
fi

# Controlla se docker-compose esiste
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${YELLOW}Creazione docker-compose.yml...${NC}"
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: fantamotogp-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: fantamotogp
      POSTGRES_PASSWORD: fantamotogp123
      POSTGRES_DB: fantamotogp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fantamotogp"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
EOF
    echo -e "${GREEN}✓ docker-compose.yml creato${NC}"
fi

# Avvia PostgreSQL con Docker
echo -e "\n${YELLOW}Avvio PostgreSQL con Docker...${NC}"
docker compose up -d

# Attendi che PostgreSQL sia pronto
echo -e "\n${YELLOW}Attendo che PostgreSQL sia pronto...${NC}"
sleep 5

# Verifica che sia attivo
if docker compose exec postgres pg_isready -U fantamotogp > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL è attivo e pronto!${NC}"
    
    # Mostra info connessione
    echo -e "\n${GREEN}Informazioni di connessione:${NC}"
    echo "Host: localhost"
    echo "Port: 5432"
    echo "Database: fantamotogp"
    echo "User: fantamotogp"
    echo "Password: fantamotogp123"
    
    # Aggiorna .env se esiste
    if [ -f "backend/.env" ]; then
        echo -e "\n${YELLOW}Vuoi aggiornare il file .env con queste credenziali? (y/N)${NC}"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            # Backup del .env esistente
            cp backend/.env backend/.env.backup
            # Aggiorna DATABASE_URL
            sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL="postgresql://fantamotogp:fantamotogp123@localhost:5432/fantamotogp"|' backend/.env
            echo -e "${GREEN}✓ .env aggiornato${NC}"
        fi
    fi
    
    echo -e "\n${GREEN}✅ Database pronto all'uso!${NC}"
    echo -e "Ora puoi eseguire: ${YELLOW}cd backend && ./init-db.sh${NC}"
else
    echo -e "${RED}✗ PostgreSQL non risponde${NC}"
    echo "Controlla i log con: docker compose logs postgres"
    exit 1
fi

# Mostra comandi utili
echo -e "\n${YELLOW}Comandi utili:${NC}"
echo "Fermare il database: docker compose down"
echo "Vedere i log: docker compose logs -f postgres"
echo "Accedere al database: docker compose exec postgres psql -U fantamotogp"
echo "pgAdmin (se installato): http://localhost:5050"