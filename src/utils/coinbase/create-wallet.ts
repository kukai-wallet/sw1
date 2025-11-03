import { buildCoinbaseJWT } from './jwt';
import type { WalletResponse } from '../../types';

// Coinbase CDP API endpoint
const BASE_URL = 'https://api.cdp.coinbase.com/platform/v1';

export async function createWallet(
	apiKeyName: string,
	apiKeyPrivateKey: string,
	walletSecretKey: string,
	networkId: string = 'base-sepolia'
): Promise<WalletResponse> {
	const path = '/wallets';
	const url = `${BASE_URL}${path}`;
	const method = 'POST';

	console.log('Creating wallet...');
	console.log('API Key Name:', apiKeyName);
	console.log('URL:', url);
	console.log('Method:', method);

	// Build JWT for API authentication (Authorization header)
	const jwtUri = `${method} ${url}`;
	console.log('JWT URI:', jwtUri);
	const apiJwt = await buildCoinbaseJWT(jwtUri, apiKeyName, apiKeyPrivateKey);
	console.log('API JWT generated (first 50 chars):', apiJwt.substring(0, 50) + '...');

	// Build JWT for Wallet authentication (X-Wallet-Auth header)
	const walletJwt = await buildCoinbaseJWT(jwtUri, apiKeyName, walletSecretKey);
	console.log('Wallet JWT generated (first 50 chars):', walletJwt.substring(0, 50) + '...');

	// Decode API JWT to debug
	const parts = apiJwt.split('.');
	try {
		const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
		const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
		console.log('API JWT Header:', JSON.stringify(header));
		console.log('API JWT Payload:', JSON.stringify(payload));
		console.log('API JWT Signature length:', parts[2].length);
	} catch (e) {
		console.log('Could not decode API JWT:', e);
	}

	console.log('Request body:', JSON.stringify({
		wallet: {
			network_id: networkId,
			use_server_signer: false,
		},
	}));

	// Make request
	const response = await fetch(url, {
		method,
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiJwt}`,
			'X-Wallet-Auth': walletJwt,
		},
		body: JSON.stringify({
			wallet: {
				network_id: networkId,
				use_server_signer: true,
			},
		}),
	});

	console.log('Response status:', response.status);

	if (!response.ok) {
		const error = await response.text();
		console.log('Error response:', error);
		throw new Error(`Coinbase API error (${response.status}): ${error}`);
	}

	const data = await response.json();
	console.log('Success! Wallet created');
	return data.wallet || data;
}
