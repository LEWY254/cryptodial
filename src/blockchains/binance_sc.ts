import Web3 from 'web3';
import {basechain} from "./basechain"

export class BinanceSmartChain implements basechain {
  provider_url: string;
  web3: Web3;

  constructor(provider_url: string) {
    this.provider_url = provider_url;
    this.web3 = new Web3(new Web3.providers.HttpProvider(provider_url));
  }

  async SendCrypto(
    sender_wallet: { address: string; privateKey: string },
    to: string,
    amount: number
  ): Promise<Record<string, any>> {
    const { address, privateKey } = sender_wallet;
    const nonce = await this.web3.eth.getTransactionCount(address, 'latest');
    const tx: Record<string,any> = {
      from: address,
      to: to,
      value: this.web3.utils.toWei(amount.toString(), 'ether'),
      gas: 21000,
      nonce: nonce,
    };

    const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
    if (!signedTx.rawTransaction) {
      throw new Error('Failed to sign transaction');
    }

    const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    return receipt;
  }

  async CheckBalance(wallet_address: string): Promise<bigint> {
    const balance = await this.web3.eth.getBalance(wallet_address);
    return BigInt(balance);
  }

  async GetHistory(block_number: number | string | Array<string>): Promise<Record<string, any>> {
    if (typeof block_number === 'number' || typeof block_number === 'string') {
      const block = await this.web3.eth.getBlock(block_number);
      return block;
    } else {
      const blocks = await Promise.all(block_number.map(block => this.web3.eth.getBlock(block)));
      return blocks;
    }
  }

  CreateNewWallet(mnemonic?: Array<string>): {
    public_address: string;
    private_key: string;
    mnemonic: Array<string>;
  } {
    const account = this.web3.eth.accounts.create();
    return {
      public_address: account.address,
      private_key: account.privateKey,
      mnemonic: [], 
      // BSC doesn't natively use mnemonics in web3.js, ill think of a workaround one day. Maybe
    };
  }

  RecoverWallet(mnemonic: Array<string>): {
    public_address: string;
    private_key: string;
    mnemonic: Array<string>;
  } {
    throw new Error('RecoverWallet method is not supported for BSC in this implementation');
  }
}