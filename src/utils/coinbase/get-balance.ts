import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

/**
 * Get wallet balance using the Coinbase SDK
 */
export async function getWalletBalance(
	apiKeyName: string,
	apiKeyPrivateKey: string,
	walletId: string
): Promise<string> {
	// Configure the SDK
	Coinbase.configure({
		apiKeyName: apiKeyName,
		privateKey: apiKeyPrivateKey,
		useServerSigner: false,
	});

	// Fetch the wallet
	const wallet = await Wallet.fetch(walletId);

	// Get balances
	const balances = await wallet.listBalances();

	// Find ETH balance
	const ethBalance = balances.get('eth');
	if (ethBalance) {
		return ethBalance.toString();
	}

	return '0';
}
