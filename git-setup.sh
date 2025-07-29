#!/bin/bash

# Vai nella cartella principale del progetto
cd fanta-motogp

# Inizializza repository Git
git init

# Crea file .gitignore principale
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.test.js

# Production
build/
dist/
*.production.js

# Misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db

# Backend specific
backend/.env
backend/dist/
backend/prisma/*.db
backend/prisma/*.db-journal
backend/uploads/

# Mobile specific
mobile-app/.expo/
mobile-app/.expo-shared/
mobile-app/dist/
mobile-app/*.jks
mobile-app/*.p8
mobile-app/*.p12
mobile-app/*.key
mobile-app/*.mobileprovision
mobile-app/*.orig.*
mobile-app/web-build/

# Temporary files
*.log
*.tmp
*.temp
.cache/
EOF

# Crea .gitignore per backend
cat > backend/.gitignore << 'EOF'
node_modules/
dist/
.env
.env.*
!.env.example
prisma/*.db
prisma/*.db-journal
prisma/migrations/dev/
coverage/
*.log
EOF

# Crea .gitignore per mobile-app
cat > mobile-app/.gitignore << 'EOF'
node_modules/
.expo/
.expo-shared/
dist/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.*
!.env.example

# macOS
.DS_Store

# Android
*.apk
android/app/build/
android/.gradle/
android/local.properties

# iOS
ios/Pods/
ios/build/
*.xcworkspace/xcuserdata/
EOF

# Aggiungi tutti i file al repository
git add .

# Primo commit
git commit -m "🚀 Initial commit - Fanta MotoGP project setup

- Backend con Express, TypeScript e Prisma
- Mobile app con React Native e Expo
- Sistema di autenticazione JWT
- Schema database completo
- Tutte le schermate principali dell'app"

echo "✅ Repository Git inizializzato con successo!"
