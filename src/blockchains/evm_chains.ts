import { JsonRpcProvider, TransactionResponse, Wallet, parseEther, Mnemonic } from "ethers";

export interface basechain {
  provider_url: string;

  SendCrypto(
    sender_wallet: Wallet,
    to: string,
    amount: number
  ): Promise<TransactionResponse>;

  CheckBalance(wallet_address: string): Promise<bigint>;

  GetHistory(
    block_number: number | string | string[]
  ): Promise<Record<string, any> | Record<string, any>[]>;

  CreateNewWallet(mnemonic?: string[]): {
    public_address: string;
    private_key: string;
    mnemonic: string[];
  };

  RecoverWallet(mnemonic: string[]): {
    public_address: string;
    private_key: string;
    mnemonic: string[];
  };
}

export class etnchain implements basechain {
  provider_url: string;
  provider: JsonRpcProvider;

  constructor(provider_url = "https://rpc.ankr.com/electroneum") {
    this.provider_url = provider_url;
    this.provider = new JsonRpcProvider(this.provider_url);
  }

  async SendCrypto(sender_wallet: Wallet, to: string, amount: number): Promise<TransactionResponse> {
    const tx: Record<any, any> = {
      to: to,
      value: parseEther(amount.toString()),
    };
    return await sender_wallet.connect(this.provider).sendTransaction(tx);
  }

  async CheckBalance(wallet_address: string): Promise<bigint> {
    return await this.provider.getBalance(wallet_address);
  }

  async GetHistory(blockNumberOrHash: number | string | string[]): Promise<Record<string, any> | Record<string, any>[]> {
    try {
      if (typeof blockNumberOrHash === 'number') {
        if (!Number.isInteger(blockNumberOrHash) || blockNumberOrHash < 0) {
          throw new Error('Invalid block number: must be a non-negative integer');
        }
        const block = await this.provider.getBlock(blockNumberOrHash, true);
        if (!block) throw new Error('Block not found');
        return block.transactions.reduce((acc, tx: any) => ({ ...acc, [tx.hash]: tx }), {});
      } else if (typeof blockNumberOrHash === 'string') {
        try {
          const block = await this.provider.getBlock(blockNumberOrHash, true);
          if (!block) throw new Error('Block not found');
          return block.transactions.reduce((acc, tx: any) => ({ ...acc, [tx.hash]: tx }), {});
        } catch (blockError) {
          const transaction = await this.provider.getTransaction(blockNumberOrHash);
          if (!transaction) throw new Error('Transaction not found');
          return { [transaction.hash]: transaction };
        }
      } else if (Array.isArray(blockNumberOrHash)) {
        const transactions = await Promise.all(
          blockNumberOrHash.map(async (transactionHash) => {
            const tx = await this.provider.getTransaction(transactionHash);
            if (!tx) throw new Error(`Transaction not found: ${transactionHash}`);
            return { [tx.hash]: tx };
          })
        );
        return Object.assign({}, ...transactions);
      } else {
        throw new Error('Invalid input type');
      }
    } catch (error: any) {
      throw new Error(`History fetch failed: ${error.message}`);
    }
  }

  CreateNewWallet(mnemonic?: string[]): { public_address: string; private_key: string; mnemonic: string[] } {
    if (mnemonic) {
      if (!Mnemonic.isValidMnemonic(mnemonic.join(" "))) {
        throw new Error("Invalid mnemonic phrase");
      }
      const wallet = Wallet.fromPhrase(mnemonic.join(" "));
      return {
        public_address: wallet.address,
        private_key: wallet.privateKey,
        mnemonic: mnemonic, // Return the input mnemonic since we validated it
      };
    }
    const randomMnemonic = Mnemonic.fromEntropy(crypto.getRandomValues(new Uint8Array(16)));
    const wallet = Wallet.fromPhrase(randomMnemonic.phrase);
    return {
      public_address: wallet.address,
      private_key: wallet.privateKey,
      mnemonic: randomMnemonic.phrase.split(" "),
    };
  }

  RecoverWallet(mnemonic: string[]): { public_address: string; private_key: string; mnemonic: string[] } {
    if (!Mnemonic.isValidMnemonic(mnemonic.join(" "))) {
      throw new Error("Invalid mnemonic phrase");
    }
    const wallet = Wallet.fromPhrase(mnemonic.join(" "));
    return {
      public_address: wallet.address,
      private_key: wallet.privateKey,
      mnemonic: mnemonic, // Return the input mnemonic since we validated it
    };
  }
}