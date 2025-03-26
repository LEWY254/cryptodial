import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { Mnemonic } from 'bitcore-mnemonic';
import fetch from 'node-fetch';

export class SolanaChain implements basechain {
  provider_url: string;
  connection: Connection;

  constructor(provider_url: string) {
    this.provider_url = provider_url;
    this.connection = new Connection(provider_url);
  }

  async SendCrypto(
    sender_wallet: { publicKey: string; secretKey: Uint8Array },
    to: string,
    amount: number
  ): Promise<Record<string, any>> {
    const sender = Keypair.fromSecretKey(sender_wallet.secretKey);
    const toPublicKey = new PublicKey(to);
    const transaction = await this.connection.requestAirdrop(sender.publicKey, amount * LAMPORTS_PER_SOL);
    return await this.connection.confirmTransaction(transaction);
  }

  async CheckBalance(wallet_address: string): Promise<bigint> {
    const publicKey = new PublicKey(wallet_address);
    const balance = await this.connection.getBalance(publicKey);
    return BigInt(balance);
  }

  async GetHistory(block_number: number | string | Array<string>): Promise<Record<string, any>> {
    if (typeof block_number === 'number') {
      const block = await this.connection.getConfirmedBlock(block_number);
      return block;
    } else if (typeof block_number === 'string') {
      const slot = await this.connection.getSlot();
      return await this.connection.getConfirmedBlock(slot);
    } else {
      const blocks = await Promise.all(block_number.map(block => this.connection.getConfirmedBlock(block)));
      return blocks;
    }
  }

  CreateNewWallet(mnemonic?: Array<string>): {
    public_address: string;
    private_key: string;
    mnemonic: Array<string>;
  } {
    const seed = mnemonic ? Mnemonic.fromWords(mnemonic).toSeed() : Mnemonic.fromRandom().toSeed();
    const keypair = Keypair.fromSeed(seed.slice(0, 32));
    return {
      public_address: keypair.publicKey.toBase58(),
      private_key: keypair.secretKey.toString(),
      mnemonic: mnemonic || seed.toString().split(' '),
    };
  }

  RecoverWallet(mnemonic: Array<string>): {
    public_address: string;
    private_key: string;
    mnemonic: Array<string>;
  } {
    const seed = Mnemonic.fromWords(mnemonic).toSeed();
    const keypair = Keypair.fromSeed(seed.slice(0, 32));
    return {
      public_address: keypair.publicKey.toBase58(),
      private_key: keypair.secretKey.toString(),
      mnemonic: mnemonic,
    };
  }
}