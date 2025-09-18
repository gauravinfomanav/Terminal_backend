# Stock Watchlist API

A Node.js REST API for managing stock watchlists in a terminal application.

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

## API Endpoints (To be implemented)

- `GET /health` - Health check endpoint
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add stock to watchlist
- `DELETE /api/watchlist/:symbol` - Remove stock from watchlist
- `GET /api/stocks/:symbol` - Get stock information
- `GET /api/stocks/:symbol/price` - Get current stock price

## Environment Variables

See `env.example` for all required environment variables.

## Next Steps

1. Implement user authentication
2. Create watchlist models and controllers
3. Integrate with stock data APIs
4. Add input validation and error handling
5. Write tests
6. Add API documentation
