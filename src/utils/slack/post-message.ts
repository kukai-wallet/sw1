export async function postEphemeralMessage(
	channel: string,
	user: string,
	text: string,
	token: string
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
			],
		}),
	});
}

export async function openModal(triggerId: string, channelId: string, token: string): Promise<void> {
	await fetch('https://api.slack.com/api/views.open', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`,
		},
		body: JSON.stringify({
			trigger_id: triggerId,
			view: {
				type: 'modal',
				callback_id: 'ai_prompt_modal',
				private_metadata: channelId,
				title: {
					type: 'plain_text',
					text: 'AI Wallet Assistant',
				},
				submit: {
					type: 'plain_text',
					text: 'Submit',
				},
				close: {
					type: 'plain_text',
					text: 'Cancel',
				},
				blocks: [
					{
						type: 'input',
						block_id: 'prompt_input',
						label: {
							type: 'plain_text',
							text: 'What would you like to do?',
						},
						element: {
							type: 'plain_text_input',
							action_id: 'prompt_text',
							placeholder: {
								type: 'plain_text',
								text: 'e.g., "create a wallet" or "show my balance"',
							},
						},
					},
				],
			},
		}),
	});
}

export function createWalletButtons(hasWallet: boolean) {
	const buttons = hasWallet ? [
		{
			type: 'button',
			text: { type: 'plain_text', text: 'Get Wallet' },
			action_id: 'get_wallet',
			value: 'get_wallet',
		},
		{
			type: 'button',
			text: { type: 'plain_text', text: 'Fund Wallet' },
			action_id: 'fund_wallet',
			value: 'fund_wallet',
		},
		{
			type: 'button',
			text: { type: 'plain_text', text: 'Remove Wallet' },
			action_id: 'remove_wallet',
			value: 'remove_wallet',
			style: 'danger',
		},
	] : [
		{
			type: 'button',
			text: { type: 'plain_text', text: 'Create Wallet' },
			action_id: 'create_wallet',
			value: 'create_wallet',
			style: 'primary',
		},
		{
			type: 'button',
			text: { type: 'plain_text', text: 'Get Wallet' },
			action_id: 'get_wallet',
			value: 'get_wallet',
		},
	];

	buttons.push({
		type: 'button',
		text: { type: 'plain_text', text: 'AI Prompt' },
		action_id: 'ai_prompt',
		value: 'ai_prompt',
		style: 'primary',
	});

	return buttons;
}
