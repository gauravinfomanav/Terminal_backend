# Deployment Guide

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
cp env.example .env
# Edit .env with your production values
```

### 3. Set Up Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing one
3. Enable Firestore Database
4. Go to Project Settings → Service Accounts
5. Click "Generate new private key"
6. Download the JSON file
7. Rename it to `serviceAccountKey.json`
8. Place it in the project root

### 4. Update Environment Variables
Edit `.env` file:
```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-frontend-domain.com
```

### 5. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

- `GET /health` - Health check
- `GET /watchlists` - Get all watchlists
- `POST /watchlists` - Create watchlist
- `GET /watchlists/:id/stocks` - Get stocks in watchlist
- `POST /watchlists/:id/stocks` - Add stock to watchlist
- `DELETE /watchlists/:id/stocks/:ticker` - Remove stock from watchlist

## Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "stock-watchlist-api"
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables Required
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)
- `CORS_ORIGIN` - Frontend domain for CORS
- Firebase service account key file

## Security Notes
- Never commit `serviceAccountKey.json` to version control
- Use proper CORS origins in production
- Set up proper Firestore security rules
- Use environment variables for all secrets
