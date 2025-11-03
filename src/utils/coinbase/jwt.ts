import { SignJWT, importPKCS8, importJWK } from 'jose';

/**
 * Build JWT for Coinbase Platform API authentication
 * Supports both Ed25519 (EdDSA) and ECDSA P-256 (ES256) keys
 */
export async function buildCoinbaseJWT(
	uri: string,
	apiKeyName: string,
	apiKeyPrivateKey: string
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);

	let key: any;
	let algorithm: string;

	// Check if the key is PEM format (ECDSA) or base64 (Ed25519)
	if (apiKeyPrivateKey.startsWith('-----BEGIN')) {
		// PEM format ECDSA key
		key = await importPKCS8(apiKeyPrivateKey, 'ES256');
		algorithm = 'ES256';
	} else if (apiKeyPrivateKey.startsWith('MIG') || apiKeyPrivateKey.startsWith('MIH')) {
		// Base64-encoded PKCS8 ECDSA key, convert to PEM
		const pem = `-----BEGIN PRIVATE KEY-----\n${apiKeyPrivateKey}\n-----END PRIVATE KEY-----`;
		key = await importPKCS8(pem, 'ES256');
		algorithm = 'ES256';
	} else {
		// Assume Ed25519 (base64-encoded 64-byte key)
		// Decode the base64 key
		const keyBytes = Uint8Array.from(atob(apiKeyPrivateKey), c => c.charCodeAt(0));

		if (keyBytes.length !== 64) {
			throw new Error(`Invalid Ed25519 key length. Expected 64 bytes, got ${keyBytes.length}`);
		}

		// Ed25519: first 32 bytes = private key (seed), last 32 bytes = public key
		const privateKeyBytes = keyBytes.slice(0, 32);
		const publicKeyBytes = keyBytes.slice(32, 64);

		// Convert to base64url format for JWK
		const toBase64Url = (bytes: Uint8Array) =>
			btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

		// Create JWK for Ed25519
		const jwk = {
			kty: 'OKP',
			crv: 'Ed25519',
			x: toBase64Url(publicKeyBytes),
			d: toBase64Url(privateKeyBytes),
		};

		key = await importJWK(jwk, 'EdDSA');
		algorithm = 'EdDSA';
	}

	// Create and sign JWT
	const jwt = await new SignJWT({
		aud: ['cdp_service'],
		uri,
	})
		.setProtectedHeader({
			alg: algorithm,
			kid: apiKeyName,
			nonce: crypto.randomUUID(),
		})
		.setSubject(apiKeyName)
		.setIssuer('coinbase-cloud')
		.setIssuedAt(now)
		.setNotBefore(now)
		.setExpirationTime(now + 120)
		.sign(key);

	return jwt;
}
