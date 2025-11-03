export async function interpretPrompt(prompt: string, apiKey: string): Promise<string> {
	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: 'You are a wallet assistant. Parse user requests and identify which wallet action they want to perform. Valid actions are: create_wallet, get_wallet, fund_wallet, remove_wallet. Respond with ONLY the action name, nothing else.',
				},
				{
					role: 'user',
					content: prompt,
				},
			],
			temperature: 0.3,
			max_tokens: 50,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI API error: ${error}`);
	}

	const data: any = await response.json();
	const action = data.choices[0].message.content.trim().toLowerCase();

	const validActions = ['create_wallet', 'get_wallet', 'fund_wallet', 'remove_wallet'];
	if (validActions.includes(action)) {
		return action;
	}

	throw new Error(`Could not understand the request. Try saying: "create a wallet", "show my wallet", "fund my wallet", or "remove my wallet"`);
}
