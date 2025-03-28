// src/index.ts
import 'dotenv/config';
import express from 'express';
import { MenuBuilder } from 'ussd-menu-builder';
import { AfricasTalking } from 'africas-talking';
import { MongoDB } from '../store/db';
import { resolver, provider_identifier } from '../services/resolver';
import { hashPin, comparePin } from '../services/utility_functions';
import { basechain } from '../blockchains/basechain';
import { etnchain } from '../blockchains/evm_chains';
import { PolygonChain } from '../blockchains/polygon';
import { BinanceSmartChain } from '../blockchains/binance_sc';
import { SolanaChain } from '../blockchains/solana';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import { validatePhoneNumber, validateWalletId, validateAmount } from './validators';

// Initialize services with proper typing
const db = new MongoDB(process.env.MONGODB_URI!);
const at = new AfricasTalking({
  apiKey: process.env.AT_API_KEY!,
  username: process.env.AT_USERNAME!
});

// Session management with SQLite
const sqlite = new Database(':memory:');
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sessionId TEXT PRIMARY KEY,
    phoneNumber TEXT NOT NULL,
    state TEXT NOT NULL,
    walletId TEXT,
    tempPin TEXT,
    tempEncryptedKey TEXT,
    tempBlockchain TEXT,
    tempData TEXT,  -- JSON string
    createdAt INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL
  );
`);

// Encryption utilities using existing crypto module
const encryptKey = (privateKey: string, pin: string): string => {
  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(pin, process.env.ENCRYPTION_SALT!, 32);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(privateKey, 'utf8'),
      cipher.final()
    ]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const decryptKey = (encrypted: string, pin: string): string => {
  try {
    const [ivHex, content] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(pin, process.env.ENCRYPTION_SALT!, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    return Buffer.concat([
      decipher.update(Buffer.from(content, 'hex')),
      decipher.final()
    ]).toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Wallet ID generation with proper validation
const generateWalletId = async (provider: string, countryCode: string): Promise<string> => {
  if (!provider || !countryCode) {
    throw new Error('Provider and country code are required');
  }

  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      const randomPart = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const walletId = `${provider}${countryCode}#${randomPart}`;
      
      const exists = await db.countDocuments('records', 'users', { walletId }) > 0;
      if (!exists) {
        return walletId;
      }
      
      attempts++;
    } catch (error) {
      throw new Error(`Failed to generate wallet ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  throw new Error('Could not generate unique wallet ID after multiple attempts');
};

// Initialize USSD menu with proper types
const menu = new MenuBuilder();

// Helper function to update session
const updateSession = (sessionId: string, updates: Record<string, any>) => {
  const setClause = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
    
  const values = [...Object.values(updates), sessionId];
  
  sqlite.prepare(`UPDATE sessions SET ${setClause} WHERE sessionId = ?`).run(...values);
};

// Main menu state
menu.startState({
  run: () => {
    return 'Welcome to Cryptodial\n1. Create Wallet\n2. Access Wallet\n3. Send Crypto\n4. Buy/Sell\n5. Market Prices\n6. Request Funds\n7. Help\n8. Exit';
  },
  next: {
    '1': 'createWallet',
    '2': 'accessWallet',
    '3': 'sendCrypto',
    '4': 'buySell',
    '5': 'marketPrices',
    '6': 'requestFunds',
    '7': 'helpSupport',
    '8': 'endSession'
  }
});

// Create Wallet flow
menu.state('createWallet', {
  run: () => {
    return 'Choose blockchain:\n1. Electroneum\n2. Ethereum\n3. Binance\n4. Polygon\n0. Back';
  },
  next: {
    '1': 'createETN',
    '2': 'createETH',
    '3': 'createBSC',
    '4': 'createPolygon',
    '0': '__start__'
  }
});

menu.state('createETN', {
  run: async () => {
    try {
      const walletId = await generateWalletId('ETN', '254');
      const chain = resolver(provider_identifier.evm);
      const wallet = chain.CreateNewWallet();
      
      updateSession(menu.session.id, {
        walletId,
        tempEncryptedKey: encryptKey(wallet.private_key, '000000'),
        tempBlockchain: 'etn',
        state: 'createETN'
      });

      return 'Enter 6-digit PIN:';
    } catch (error) {
      console.error('Wallet creation failed:', error);
      return 'Error creating wallet. Please try again.';
    }
  },
  next: {
    '*\\d{6}': 'confirmPin'
  }
});

// ... (other blockchain creation states follow same pattern)

menu.state('confirmPin', {
  run: async () => {
    try {
      const pin = menu.val;
      if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
        return 'Invalid PIN. Must be 6 digits.';
      }

      const session = sqlite.prepare('SELECT * FROM sessions WHERE sessionId = ?').get(menu.session.id);
      if (!session) {
        return 'Session expired. Please start again.';
      }

      const hashedPin = hashPin(pin);
      const privateKey = decryptKey(session.tempEncryptedKey, '000000');
      const encryptedKey = encryptKey(privateKey, pin);

      // Save to database
      await db.insertDocument('records', 'users', {
        walletId: session.walletId,
        phoneNumber: menu.args.phoneNumber,
        pinHash: hashedPin,
        encryptedKey,
        blockchain: session.tempBlockchain,
        createdAt: new Date()
      });

      // Send SMS
      await at.sendSms({
        to: menu.args.phoneNumber,
        message: `Cryptodial Wallet\nID: ${session.walletId}\nKey: ${privateKey}\n\nKeep this information secure!`
      });

      return 'Wallet created! Check SMS.\n1. Continue\n0. Back';
    } catch (error) {
      console.error('PIN confirmation failed:', error);
      return 'An error occurred. Please try again.';
    }
  },
  next: {
    '1': '__start__',
    '0': '__start__'
  }
});

// Access Wallet flow with validation
menu.state('accessWallet', {
  run: () => {
    return 'Enter Wallet ID:';
  },
  next: {
    '*': 'validateWalletId'
  }
});

menu.state('validateWalletId', {
  run: () => {
    const walletId = menu.val;
    if (!validateWalletId(walletId)) {
      return 'Invalid Wallet ID format. Example: ETN254#1234567890';
    }
    
    updateSession(menu.session.id, {
      tempData: JSON.stringify({ walletId }),
      state: 'validateWalletId'
    });
    
    return 'Enter 6-digit PIN:';
  },
  next: {
    '*\\d{6}': 'verifyWalletAccess'
  }
});

menu.state('verifyWalletAccess', {
  run: async () => {
    try {
      const session = sqlite.prepare('SELECT * FROM sessions WHERE sessionId = ?').get(menu.session.id);
      if (!session || !session.tempData) {
        return 'Session expired. Please start again.';
      }

      const { walletId } = JSON.parse(session.tempData);
      const pin = menu.val;
      
      const [user] = await db.findDocuments('records', 'users', { walletId });
      if (!user || !comparePin(pin, user.pinHash)) {
        return 'Invalid credentials. Please try again.';
      }

      updateSession(menu.session.id, {
        walletId,
        tempPin: pin,
        state: 'verifyWalletAccess'
      });

      return '1. View Balance\n2. Transactions\n3. Manage Wallet\n0. Back';
    } catch (error) {
      console.error('Wallet access failed:', error);
      return 'An error occurred. Please try again.';
    }
  },
  next: {
    '1': 'viewBalance',
    '2': 'viewTransactions',
    '3': 'manageWallet',
    '0': '__start__'
  }
});

// Send Crypto flow with validation
menu.state('sendCrypto', {
  run: () => {
    return 'Enter recipient Wallet ID:';
  },
  next: {
    '*': 'validateRecipient'
  }
});

menu.state('validateRecipient', {
  run: () => {
    const recipient = menu.val;
    if (!validateWalletId(recipient)) {
      return 'Invalid Wallet ID format. Example: ETN254#1234567890';
    }
    
    updateSession(menu.session.id, {
      tempData: JSON.stringify({ recipient }),
      state: 'validateRecipient'
    });
    
    return 'Enter amount:';
  },
  next: {
    '*': 'validateAmount'
  }
});

menu.state('validateAmount', {
  run: () => {
    const amount = parseFloat(menu.val);
    if (!validateAmount(amount)) {
      return 'Invalid amount. Must be a positive number.';
    }
    
    const session = sqlite.prepare('SELECT * FROM sessions WHERE sessionId = ?').get(menu.session.id);
    const tempData = session.tempData ? JSON.parse(session.tempData) : {};
    
    updateSession(menu.session.id, {
      tempData: JSON.stringify({ ...tempData, amount }),
      state: 'validateAmount'
    });
    
    return `Confirm send ${amount} to ${tempData.recipient}?\n1. Yes\n2. No`;
  },
  next: {
    '1': 'executeSend',
    '2': '__start__'
  }
});

menu.state('executeSend', {
  run: async () => {
    try {
      const session = sqlite.prepare('SELECT * FROM sessions WHERE sessionId = ?').get(menu.session.id);
      if (!session || !session.tempData || !session.walletId || !session.tempPin) {
        return 'Session expired. Please start again.';
      }

      const { recipient, amount } = JSON.parse(session.tempData);
      
      // Get sender details with validation
      const [sender] = await db.findDocuments('records', 'users', { walletId: session.walletId });
      if (!sender) {
        return 'Wallet not found.';
      }

      // Secure private key decryption
      let privateKey: string;
      try {
        privateKey = decryptKey(sender.encryptedKey, session.tempPin);
        if (!privateKey || privateKey.length < 64) {
          throw new Error('Invalid key decryption');
        }
      } catch (decryptError) {
        console.error('Decryption failed:', decryptError);
        // Security: Clear sensitive data from session
        updateSession(menu.session.id, { tempPin: null });
        return 'Security verification failed. Please restart.';
      }

      // Get recipient with validation
      const [receiver] = await db.findDocuments('records', 'users', { walletId: recipient });
      if (!receiver) {
        return 'Recipient wallet not found.';
      }

      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        return 'Invalid amount specified.';
      }

      // Get blockchain instance with error handling
      let chain: basechain;
      try {
        chain = resolver(sender.blockchain as provider_identifier);
      } catch (chainError) {
        console.error('Blockchain resolver failed:', chainError);
        return 'Network error. Please try again later.';
      }

      // Execute transaction with comprehensive error handling
      let txReceipt: Record<string, any>;
      try {
        txReceipt = await chain.SendCrypto(
          { address: sender.walletId, privateKey },
          receiver.walletId,
          amount
        );

        if (!txReceipt?.transactionHash) {
          throw new Error('No transaction hash received');
        }
      } catch (txError) {
        console.error('Transaction failed:', txError);
        
        // Record failed transaction
        await db.insertDocument('records', 'transactions', {
          senderWalletId: session.walletId,
          recipientWalletId: recipient,
          amount,
          currency: sender.blockchain,
          status: 'failed',
          error: txError instanceof Error ? txError.message : 'Unknown error',
          createdAt: new Date()
        });

        return `Transaction failed: ${txError instanceof Error ? txError.message : 'Please try again'}`;
      }

      // Record successful transaction
      await db.insertDocument('records', 'transactions', {
        senderWalletId: session.walletId,
        recipientWalletId: recipient,
        amount,
        currency: sender.blockchain,
        txHash: txReceipt.transactionHash,
        status: 'completed',
        networkFee: txReceipt.gasUsed ? String(txReceipt.gasUsed) : undefined,
        blockNumber: txReceipt.blockNumber,
        createdAt: new Date()
      });

      // Send confirmation SMS with error handling
      try {
        await at.sendSms({
          to: menu.args.phoneNumber,
          message: `Cryptodial Transaction\nSent: ${amount} ${sender.blockchain}\nTo: ${recipient}\nTxnID: ${txReceipt.transactionHash.slice(0, 12)}...\n\nView: ${getExplorerLink(sender.blockchain, txReceipt.transactionHash)}`
        });
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
        // Continue even if SMS fails
      }

      // Clear sensitive data from session
      updateSession(menu.session.id, { 
        tempPin: null,
        tempData: null
      });

      return `Transaction successful!\n\nTxnID: ${txReceipt.transactionHash.slice(0, 12)}...\n\n1. New Transaction\n0. Main Menu`;
    } catch (error) {
      console.error('Unexpected error in executeSend:', error);
      return 'System error. Please try again.';
    }
  },
  next: {
    '1': 'sendCrypto',
    '0': '__start__'
  }
});

// Helper function to get blockchain explorer link
function getExplorerLink(blockchain: string, txHash: string): string {
  const explorers = {
    etn: 'https://etnscan.com/tx/',
    eth: 'https://etherscan.io/tx/',
    bsc: 'https://bscscan.com/tx/',
    polygon: 'https://polygonscan.com/tx/'
  };
  return `${explorers[blockchain as keyof typeof explorers] || 'https://explorer.example.com/tx/'}${txHash}`;
}

// Session cleanup on server start
function initializeSessionCleanup() {
  // Cleanup every 5 minutes
  setInterval(() => {
    const cutoff = Date.now() - 300000; // 5 minutes
    sqlite.prepare('DELETE FROM sessions WHERE expiresAt < ?').run(cutoff);
    console.log('Cleaned up expired sessions');
  }, 300000);
  
  // Immediate cleanup on startup
  sqlite.prepare('DELETE FROM sessions WHERE expiresAt < ?').run(Date.now());
}

// Start the server with error handling
function startServer() {
  const PORT = process.env.PORT || 3000;
  
  db.connect().then(() => {
    console.log('✅ MongoDB connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🔄 USSD server running on port ${PORT}`);
      initializeSessionCleanup();
    });
  }).catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });
}

// Start the application
startServer();