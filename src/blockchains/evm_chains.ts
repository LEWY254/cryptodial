import { basechain } from "./basechain"
import { JsonRpcProvider, TransactionResponse, Wallet ,parseEther} from "ethers";


export class etnchain implements basechain{
    provider_url: string
    provider:JsonRpcProvider
    constructor(provider_url="https://rpc.ankr.com/electroneum"){
        this.provider_url=provider_url;
        this.provider=new JsonRpcProvider(this.provider_url)
    }
    

    async SendCrypto(sender_wallet:Wallet,to:string,amount:number):Promise<TransactionResponse>{
        const tx={
            to:to,
            value:parseEther(amount.toString()),
            gasLimit:21000,
        }
        const signedTx=await sender_wallet.connect(this.provider).sendTransaction(tx)
        return signedTx
    };
    
    async CheckBalance(wallet_adress:string):Promise<bigint>{
        const balance=await this.provider.getBalance(wallet_adress)
        return balance
    };
    GetHistory(block_number:number|string|Array<string>):Record<string, any>;
    CreateNewWallet(mnemonic?:Array<string>):{public_adress:string,private_key:string,mnemonic:Array<string>}
    RecoverWallet(mnemonic:Array<string>):{public_adress:string,private_key:string,mnemonic:Array<string>}
}
/** 
 * Methods i may use
 * eth_syncing
 * eth_gasPrice
 * eth_accounts
 * eth_blocknumber (if i need to check the recent block)
 * eth_getBalance
 * eth_getTransactionCount
 * eth_getBlockByHash
 * eth_getTransactionByHash
 * eth_getTransactionReceipt
 * 
 */