import { createWalletButtons } from './post-message';

/**
 * Post ephemeral message with buttons to Slack
 */
export async function postEphemeralWithButtons(
	channel: string,
	user: string,
	text: string,
	token: string,
	hasWallet: boolean
): Promise<void> {
	await fetch('https://slack.com/api/chat.postEphemeral', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`,
		},
		body: JSON.stringify({
			channel,
			user,
			text,
			blocks: [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text,
					},
				},
				{
					type: 'actions',
					elements: createWalletButtons(hasWallet),
				},
			],
		}),
	});
}
