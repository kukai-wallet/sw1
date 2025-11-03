import { Coinbase, Wallet, FaucetTransaction } from '@coinbase/coinbase-sdk';

/**
 * Fund wallet using Coinbase testnet faucet
 */
export async function fundWalletWithFaucet(
	apiKeyName: string,
	apiKeyPrivateKey: string,
	walletId: string
): Promise<FaucetTransaction> {
	console.log('Funding wallet with faucet...');
	console.log('Wallet ID:', walletId);

	// Configure the SDK
	Coinbase.configure({
		apiKeyName: apiKeyName,
		privateKey: apiKeyPrivateKey,
		useServerSigner: false,
	});

	// Fetch the wallet
	const wallet = await Wallet.fetch(walletId);

	// Get the default address
	const address = await wallet.getDefaultAddress();

	if (!address) {
		throw new Error('No default address found');
	}

	console.log('Requesting faucet funds for address:', address.getId());

	// Request faucet funds
	const faucetTx = await address.faucet();

	console.log('Faucet transaction:', faucetTx.getTransactionHash());

	return faucetTx;
}
