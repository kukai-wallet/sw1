export async function verifySlackRequest(
	request: Request,
	signingSecret: string
): Promise<boolean> {
	const signature = request.headers.get('X-Slack-Signature');
	const timestamp = request.headers.get('X-Slack-Request-Timestamp');

	if (!signature || !timestamp) return false;

	const now = Math.floor(Date.now() / 1000);
	if (Math.abs(now - parseInt(timestamp)) > 60 * 5) return false;

	const body = await request.clone().text();
	const baseString = `v0:${timestamp}:${body}`;

	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(signingSecret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signatureBytes = await crypto.subtle.sign(
		'HMAC',
		key,
		encoder.encode(baseString)
	);

	const computedSignature = `v0=${Array.from(new Uint8Array(signatureBytes))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('')}`;

	return computedSignature === signature;
}
