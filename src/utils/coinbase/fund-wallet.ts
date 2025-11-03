import { buildCoinbaseJWT } from './jwt';

// Coinbase CDP API endpoint
const BASE_URL = 'https://api.cdp.coinbase.com/platform/v1';

export async function fundWallet(
	apiKeyName: string,
	apiKeyPrivateKey: string,
	walletId: string,
	assetId: string = 'eth'
): Promise<void> {
	const path = `/wallets/${walletId}/faucet`;
	const url = `${BASE_URL}${path}`;
	const method = 'POST';

	const jwt = await buildCoinbaseJWT(`${method} ${url}`, apiKeyName, apiKeyPrivateKey);

	const response = await fetch(url, {
		method,
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${jwt}`,
		},
		body: JSON.stringify({ asset_id: assetId }),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Coinbase API error (${response.status}): ${error}`);
	}
}
