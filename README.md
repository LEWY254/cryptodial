# Cryptodial USSD Gateway

A blockchain banking solution accessible via USSD, enabling users to create wallets, send/receive crypto, and check balances without internet access. Integrates with multiple blockchains (ETN, ETH, BSC, Polygon) via Africa's Talking SMS/USSD API.

## Key Features

- 🔐 **Non-custodial wallet system** (private keys never stored unencrypted)
- 📱 **USSD interface** for feature phones
- 💸 **Multi-chain support** (Electroneum, Ethereum, Binance Smart Chain, Polygon)
- 📨 **SMS notifications** for transactions and wallet creation
- 🛡️ **PIN-based security** with AES-256 encryption
- 📊 **Transaction history tracking**

## Technology Stack

- **Backend:** Node.js (Express)
- **Database:** MongoDB
- **Cache:** Unconventional but i used sql lite.
- **Blockchain Integration:** Custom provider system
- **USSD/SMS:** Africa's Talking API

## Installation

### Prerequisites

1. Node.js v16+
2. MongoDB 5.0+
3. Africa's Talking API account
4. Redis/SQL (optional for production sessions)

### Setup Steps

```sh
# Clone repository
git clone https://github.com/LEWY254/cryptodial.git
cd cryptodial-ussd

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your credentials:

```ini
MONGODB_URI=mongodb://localhost:27017/records
AT_API_KEY=your_africas_talking_key
AT_USERNAME=your_africas_talking_username
ENCRYPTION_SALT=your-secure-salt-value-here
PORT=3000
```

## Running the Server

### Development Mode

```sh
npm run dev
```

### Production Mode

```sh
npm build
npm start
```

## USSD Menu Structure

```
*384*456# → Main Menu:
1. Create Wallet
2. Access Wallet
3. Send Crypto
4. Buy/Sell
5. Market Prices
6. Request Funds
7. Help
8. Exit
```

## Testing

Run the test suite:

```sh
npm test
```

### Test coverage includes:

- PIN encryption/decryption
- Wallet ID generation
- USSD state transitions
- MongoDB operations

## Deployment

### Recommended Production Setup

1. **NGINX Reverse Proxy** with SSL termination
2. **PM2 Process Manager**
3. **Redis** for session storage
4. **MongoDB Atlas** for database

### Example PM2 config (`ecosystem.config.js`):

```js
module.exports = {
  apps: [{
    name: 'cryptodial',
    script: 'dist/index.js',
    instances: 'max',
    env: {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://prod-user:password@cluster0.mongodb.net/records'
    }
  }]
};
```

## Security Considerations

### 1. Private Key Handling

- Keys are encrypted with user PINs
- Never stored in plaintext
- Only decrypted in memory during transactions

### 2. PIN Security

- Hashed with SHA-256 + salt
- Minimum 6-digit requirement
- Rate limiting on failed attempts

### 3. Session Protection

- 5-minute automatic expiration
- SQLite session storage (Redis recommended for production)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/xyz`)
3. Commit changes (`git commit -am 'Add feature xyz'`)
4. Push to branch (`git push origin feature/xyz`)
5. Open Pull Request

## License

MIT License - See `LICENSE` file
