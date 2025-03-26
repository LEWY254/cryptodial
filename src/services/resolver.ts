import { basechain } from "../blockchains/basechain";
import { etnchain } from "../blockchains/evm_chains";
import { PolygonChain } from "../blockchains/polygon";
import { SolanaChain } from "../blockchains/solana";
import { BinanceChain } from "../blockchains/binance_sc";

enum provider_identifier {
    evm = "evm",
    polygon = "polygon",
    solana = "solana",
    binance = "binance",
}

async function resolver(identifier: provider_identifier): Promise<basechain> {
    switch (identifier) {
        case provider_identifier.evm:
            return new etnchain("https://rpc.ankr.com/electroneum");
        case provider_identifier.polygon:
            return new PolygonChain("https://rpc-mainnet.matic.network");
        case provider_identifier.solana:
            return new SolanaChain("https://api.mainnet-beta.solana.com");
        case provider_identifier.binance:
            return new BinanceChain("https://bsc-dataseed.binance.org/");
        default:
            throw new Error(`Unsupported provider identifier: ${identifier}`);
    }
}