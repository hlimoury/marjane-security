# Marjane - Plateforme de Gestion de Securite

Plateforme web pour gerer la securite des supermarches Marjane par region.

## Technologies

- **Frontend**: React 18, Vite, Tailwind CSS, React Router
- **Backend**: Node.js, Express, JWT
- **Base de donnees**: PostgreSQL

## Prerequis

- [Node.js](https://nodejs.org/) v18 ou plus
- [Git](https://git-scm.com/)
- Une base de donnees PostgreSQL (locale ou distante)

## Installation locale

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd "project marjane react"
```

### 2. Configurer la base de donnees

Creer un fichier `server/.env` avec :

```
DATABASE_URL=postgresql://user:password@host:5432/marjane_db
JWT_SECRET=votre_secret_jwt
PORT=5000
```

### 3. Installer les dependances

```bash
cd server && npm install
cd ../client && npm install
```

### 4. Demarrer le serveur (backend)

```bash
cd server
npm run dev
```

Le serveur cree automatiquement les tables et les comptes par defaut.

### 5. Demarrer le client (frontend)

```bash
cd client
npm run dev
```

Ouvrir http://localhost:5173

## Comptes par defaut

| Utilisateur | Mot de passe | Role | Region |
|-------------|-------------|------|--------|
| admin | admin123 | Administrateur | Toutes |
| main | main123 | MAIN | Toutes |
| centre1 | centre1123 | Region | REGION CENTRE 1 |
| centre2 | centre2123 | Region | REGION CENTRE 02 |
| sud | sud123 | Region | REGION SUD |
| orient | orient123 | Region | REGION ORIENT |
| nord | nord123 | Region | REGION NORD |

## Deploiement sur Render

### 1. Creer un compte sur [render.com](https://render.com)

### 2. Creer la base de donnees PostgreSQL
- New -> PostgreSQL
- Copier l'Internal Database URL

### 3. Deployer le Backend
- New -> Web Service
- Connecter le repo GitHub
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Variables d'environnement:
  - `DATABASE_URL` = l'URL de la DB Render
  - `JWT_SECRET` = un secret aleatoire
  - `NODE_ENV` = production

### 4. Deployer le Frontend
- New -> Static Site
- Connecter le repo GitHub
- Root Directory: `client`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Variable d'environnement:
  - `VITE_API_URL` = l'URL du backend (ex: https://marjane-api.onrender.com)
