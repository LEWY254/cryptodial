
export interface basechain {
  provider_url: string;

  SendCrypto(
    sender_wallet: Record<string,any>,
    to: string,
    amount: number
  ): Promise<Record<string, any>>;

  CheckBalance(wallet_address: string): Promise<bigint>;

  GetHistory(
    block_number: number | string | Array<string>
  ): Promise<Record<string, any>>;

  CreateNewWallet(mnemonic?: Array<string>): {
    public_address: string;
    private_key: string;
    mnemonic: Array<string>;
  };

  RecoverWallet(mnemonic: Array<string>): {
    public_address: string;
    private_key: string;
    mnemonic: Array<string>;
  };
}

