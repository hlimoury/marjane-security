# Marjane Security — Chatbot (Python + Groq)

Assistant conversationnel pour le dashboard admin. Répond en français aux questions sur les interpellations, totaux et indicateurs de sécurité.

## Architecture

```
React (ChatbotWidget)  →  Python FastAPI (/chat)  →  Groq LLM (gratuit)
                              ↓
                    Marjane Node API (JWT)
                              ↓
                         PostgreSQL
```

## Prérequis

- Python 3.10+
- Compte **Groq** gratuit : https://console.groq.com
- Backend Marjane accessible (local ou Render)
- Compte **admin** sur la plateforme

## Installation

```powershell
cd chatbot
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Éditez `.env` :

```env
GROQ_API_KEY=gsk_votre_cle_groq
MARJANE_API_URL=https://marjane-security.onrender.com
CHATBOT_PORT=8000
```

## Déploiement Render (production)

1. Push le repo sur GitHub.
2. Sur [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**.
3. Connecter le repo `marjane-security`.
4. Settings :
   - **Name:** `marjane-chatbot`
   - **Root Directory:** `chatbot`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Environment variables :
   - `GROQ_API_KEY` = votre clé Groq
   - `MARJANE_API_URL` = `https://marjane-security.onrender.com`
   - `GROQ_MODEL` = `llama-3.1-8b-instant`
6. Deploy → URL publique : `https://marjane-chatbot.onrender.com`
7. Sur le **Static Site** frontend (`marjane-security-1`) ajouter :
   - `VITE_CHATBOT_URL` = `https://marjane-chatbot.onrender.com`
   - `VITE_API_URL` = `https://marjane-security.onrender.com`
   puis **Manual Deploy** (rebuild).

Le chatbot est **admin uniquement** (widget React + vérification `/api/auth/me` côté Python).

## Lancer le chatbot (local)

```powershell
cd chatbot
.\venv\Scripts\activate
python main.py
```

Le serveur démarre sur **http://localhost:8000**

Test santé : http://localhost:8000/health

## Lancer le frontend

Dans un autre terminal :

```powershell
cd client
npm run dev
```

Optionnel — dans `client/.env` :

```env
VITE_CHATBOT_URL=http://localhost:8000
```

Connectez-vous en **admin**, cliquez sur le bouton **Assistant** en bas à droite.

## LLM gratuit utilisé

| Provider | Modèle | Coût |
|----------|--------|------|
| **Groq** | llama-3.1-8b-instant | Gratuit (tier free) |

Alternatives pour démo scolaire :
- **Google Gemini Flash** (gratuit, clé API Google AI Studio)
- **Ollama** (100% local, sans clé — à intégrer plus tard)

## Outils disponibles (V1)

Le chatbot interroge l'API Marjane via 3 fonctions :

1. **get_interpellations_stats** — interpellations par type, rayon, KDH, poursuites
2. **get_dashboard_overview** — vue globale du dashboard
3. **get_totals** — totaux par catégorie sur une période

## Questions de démo (pour soutenance)

1. Combien d'interpellations Client en 2026 ?
2. Quel rayon a récupéré le plus de KDH ?
3. Combien de poursuites judiciaires cette année ?
4. Donne-moi un résumé du dashboard sécurité.
5. Combien de personnes interpellées au total ?
6. Quelles sont les interpellations en REGION SUD ?
7. Compare les interpellations Client et Personnel.
8. Quels sont les totaux par catégorie en janvier 2026 ?
9. Quel rayon a le plus d'entrées d'interpellations ?
10. Combien de magasins sont suivis sur la plateforme ?

## Structure du code

| Fichier | Rôle |
|---------|------|
| `main.py` | API FastAPI (`/health`, `/chat`) |
| `llm.py` | Appels Groq + boucle tool-calling |
| `tools.py` | Interrogation API Marjane |
| `prompts.py` | Prompt système + définitions outils |
| `client/src/components/ChatbotWidget.jsx` | Widget chat admin |

## Pour le rapport (Adama Samake)

- **Chapitre Conception** : diagramme architecture ci-dessus, UML composants
- **Chapitre Réalisation** : Python 3, FastAPI, Groq, httpx, React
- **Chapitre Résultats** : tester les 10 questions de démo, mesurer pertinence

## Dépannage

| Problème | Solution |
|----------|----------|
| `GROQ_API_KEY manquant` | Créez `.env` avec votre clé Groq |
| Erreur CORS | Le chatbot autorise toutes les origines en dev |
| Erreur 401 | Reconnectez-vous en admin sur le site |
| Chatbot inaccessible | Vérifiez `VITE_CHATBOT_URL` et que Python tourne sur le port 8000 |
| Render backend lent | Première requête peut prendre ~30 s (tier free) |
