import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

/**
 * Create a wallet using the Coinbase SDK
 * This handles all authentication and JWT generation automatically
 */
export async function createWalletWithSDK(
	apiKeyName: string,
	apiKeyPrivateKey: string,
	networkId: string = 'base-sepolia'
) {
	console.log('Creating wallet with Coinbase SDK...');
	console.log('API Key Name:', apiKeyName);
	console.log('Network:', networkId);

	// Configure the SDK
	// Note: useServerSigner: false because we don't have Server-Signer infrastructure deployed
	Coinbase.configure({
		apiKeyName: apiKeyName,
		privateKey: apiKeyPrivateKey,
		useServerSigner: false,
	});

	console.log('SDK configured, creating wallet...');

	// Create the wallet
	const wallet = await Wallet.create({
		networkId: networkId as any,
	});

	console.log('Wallet created successfully!');
	console.log('Wallet ID:', wallet.getId());

	// Get the default address
	const address = await wallet.getDefaultAddress();
	console.log('Default address:', address?.getId());

	return {
		id: wallet.getId(),
		network_id: networkId,
		default_address: {
			address_id: address?.getId() || '',
		},
	};
}
