# Stock Watchlist API

A Node.js REST API for managing stock watchlists in a terminal application.

## 🚀 LIVE API
**Production URL:** https://terminal.musaffa.us

## Project Structure

```
NodeJS-terminal/
├── server.js                 # Main server entry point
├── package.json              # Dependencies and scripts
├── env.example               # Environment variables template
├── .gitignore               # Git ignore rules
├── src/
│   ├── app.js               # Express app configuration
│   ├── config/
│   │   └── database.js      # MongoDB connection setup
│   ├── controllers/         # Route handlers
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API routes
│   ├── middleware/          # Custom middleware
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
├── tests/
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
├── logs/                    # Application logs
└── public/                  # Static files
```

## Dependencies Installed

### Core Dependencies
- **express**: Web framework for Node.js
- **mongoose**: MongoDB object modeling
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **helmet**: Security middleware
- **morgan**: HTTP request logger
- **express-rate-limit**: Rate limiting middleware
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token handling
- **express-validator**: Input validation

### Development Dependencies
- **nodemon**: Auto-restart during development
- **concurrently**: Run multiple commands concurrently

## Getting Started

1. Copy environment variables:
   ```bash
   cp env.example .env
   ```

2. Update `.env` file with your configuration

3. Install MongoDB and ensure it's running

4. Start the development server:
   ```bash
   npm run dev
   ```

5. The API will be available at `http://localhost:3000`

## API Endpoints

**Base URL:** https://terminal.musaffa.us

- `GET /health` - Health check endpoint
- `GET /watchlists` - Get all watchlists
- `POST /watchlists` - Create watchlist
- `GET /watchlists/:id/stocks` - Get stocks in watchlist
- `POST /watchlists/:id/stocks` - Add stock to watchlist
- `DELETE /watchlists/:id/stocks/:ticker` - Remove stock from watchlist

### Example API Calls
```bash
# Health check
curl https://terminal.musaffa.us/health

# Get all watchlists
curl https://terminal.musaffa.us/watchlists

# Create watchlist
curl -X POST https://terminal.musaffa.us/watchlists \
  -H "Content-Type: application/json" \
  -d '{"name": "My Tech Stocks"}'
```

## Environment Variables

See `env.example` for all required environment variables.

## Next Steps

1. Implement user authentication
2. Create watchlist models and controllers
3. Integrate with stock data APIs
4. Add input validation and error handling
5. Write tests
6. Add API documentation
