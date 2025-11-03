import { createWalletWithSDK } from '../utils/coinbase/sdk-wallet';
import { getWalletBalance } from '../utils/coinbase/get-balance';
import { fundWalletWithFaucet } from '../utils/coinbase/fund-wallet-sdk';
import { postEphemeralMessage, createWalletButtons } from '../utils/slack/post-message';
import { postEphemeralWithButtons } from '../utils/slack/post-message-with-buttons';
import type { Env, UserState } from '../types';

export async function handleCreateWallet(
	userId: string,
	env: Env,
	responseUrl: string
): Promise<void> {
	const existing = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');

	if (existing?.walletId) {
		// Get balance
		const balance = await getWalletBalance(
			env.COINBASE_API_KEY_NAME,
			env.COINBASE_API_KEY_PRIVATE_KEY,
			existing.walletId
		);

		await fetch(responseUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				response_type: 'ephemeral',
				replace_original: false,
				text: `✅ *Wallet already exists!*\n\n*Address:* \`${existing.address}\`\n*Network:* ${existing.network}\n*Balance:* ${balance} ETH`,
				blocks: [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: `✅ *Wallet already exists!*\n\n*Address:* \`${existing.address}\`\n*Network:* ${existing.network}\n*Balance:* ${balance} ETH`,
						},
					},
					{
						type: 'actions',
						elements: createWalletButtons(true),
					},
				],
			}),
		});
		return;
	}

	const wallet = await createWalletWithSDK(
		env.COINBASE_API_KEY_NAME,
		env.COINBASE_API_KEY_PRIVATE_KEY,
		'base-sepolia'
	);

	await env.USER_STATE.put(`user:${userId}`, JSON.stringify({
		walletId: wallet.id,
		address: wallet.default_address.address_id,
		network: wallet.network_id,
	} as UserState));

	await fetch(responseUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			response_type: 'ephemeral',
			replace_original: false,
			text: `🎉 *Wallet created successfully!*\n\n*Address:* \`${wallet.default_address.address_id}\`\n*Network:* ${wallet.network_id}`,
		}),
	});
}

export async function handleGetWallet(
	userId: string,
	env: Env,
	responseUrl: string
): Promise<void> {
	const state = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');

	if (!state?.walletId) {
		await fetch(responseUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				response_type: 'ephemeral',
				replace_original: false,
				text: '❌ *No wallet found.* Create one first!',
			}),
		});
		return;
	}

	// Get balance
	const balance = await getWalletBalance(
		env.COINBASE_API_KEY_NAME,
		env.COINBASE_API_KEY_PRIVATE_KEY,
		state.walletId
	);

	await fetch(responseUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			response_type: 'ephemeral',
			replace_original: false,
			text: `💼 *Your wallet:*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}\n*Balance:* ${balance} ETH`,
			blocks: [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: `💼 *Your wallet:*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}\n*Balance:* ${balance} ETH`,
					},
				},
				{
					type: 'actions',
					elements: createWalletButtons(true),
				},
			],
		}),
	});
}

export async function handleFundWallet(
	userId: string,
	env: Env,
	responseUrl: string
): Promise<void> {
	const state = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');

	if (!state?.walletId) {
		await fetch(responseUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				response_type: 'ephemeral',
				replace_original: false,
				text: '❌ *No wallet found.* Create one first!',
			}),
		});
		return;
	}

	// Fund wallet using faucet
	const faucetTx = await fundWalletWithFaucet(
		env.COINBASE_API_KEY_NAME,
		env.COINBASE_API_KEY_PRIVATE_KEY,
		state.walletId
	);

	// Get updated balance
	const balance = await getWalletBalance(
		env.COINBASE_API_KEY_NAME,
		env.COINBASE_API_KEY_PRIVATE_KEY,
		state.walletId
	);

	await fetch(responseUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			response_type: 'ephemeral',
			replace_original: false,
			text: `💰 *Funding requested successfully!*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}\n*Balance:* ${balance} ETH\n*Transaction:* ${faucetTx.getTransactionHash()}`,
			blocks: [
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: `💰 *Funding requested successfully!*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}\n*Balance:* ${balance} ETH\n*Transaction:* ${faucetTx.getTransactionHash()}`,
					},
				},
				{
					type: 'actions',
					elements: createWalletButtons(true),
				},
			],
		}),
	});
}

export async function handleRemoveWallet(
	userId: string,
	env: Env,
	responseUrl: string
): Promise<void> {
	await env.USER_STATE.delete(`user:${userId}`);

	await fetch(responseUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			response_type: 'ephemeral',
			replace_original: false,
			text: '🗑️ *Wallet removed successfully!*',
		}),
	});
}

export async function handleAIAction(
	userId: string,
	action: string,
	channelId: string,
	env: Env
): Promise<void> {
	switch (action) {
		case 'create_wallet': {
			const existing = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');
			if (existing?.walletId) {
				const balance = await getWalletBalance(
					env.COINBASE_API_KEY_NAME,
					env.COINBASE_API_KEY_PRIVATE_KEY,
					existing.walletId
				);
				await postEphemeralWithButtons(
					channelId,
					userId,
					`✅ *Wallet already exists!*\n\n*Address:* \`${existing.address}\`\n*Network:* ${existing.network}\n*Balance:* ${balance} ETH`,
					env.SLACK_BOT_TOKEN,
					true
				);
			} else {
				const wallet = await createWalletWithSDK(
					env.COINBASE_API_KEY_NAME,
					env.COINBASE_API_KEY_PRIVATE_KEY,
					'base-sepolia'
				);
				await env.USER_STATE.put(`user:${userId}`, JSON.stringify({
					walletId: wallet.id,
					address: wallet.default_address.address_id,
					network: wallet.network_id,
				} as UserState));
				await postEphemeralWithButtons(
					channelId,
					userId,
					`🎉 *Wallet created successfully!*\n\n*Address:* \`${wallet.default_address.address_id}\`\n*Network:* ${wallet.network_id}\n*Balance:* 0 ETH`,
					env.SLACK_BOT_TOKEN,
					true
				);
			}
			break;
		}
		case 'get_wallet': {
			const state = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');
			if (!state?.walletId) {
				await postEphemeralMessage(channelId, userId, '❌ *No wallet found.* Create one first!', env.SLACK_BOT_TOKEN);
			} else {
				const balance = await getWalletBalance(
					env.COINBASE_API_KEY_NAME,
					env.COINBASE_API_KEY_PRIVATE_KEY,
					state.walletId
				);
				await postEphemeralWithButtons(
					channelId,
					userId,
					`💼 *Your wallet:*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}\n*Balance:* ${balance} ETH`,
					env.SLACK_BOT_TOKEN,
					true
				);
			}
			break;
		}
		case 'fund_wallet': {
			const state = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');
			if (!state?.walletId) {
				await postEphemeralMessage(channelId, userId, '❌ *No wallet found.* Create one first!', env.SLACK_BOT_TOKEN);
			} else {
				const faucetTx = await fundWalletWithFaucet(
					env.COINBASE_API_KEY_NAME,
					env.COINBASE_API_KEY_PRIVATE_KEY,
					state.walletId
				);
				const balance = await getWalletBalance(
					env.COINBASE_API_KEY_NAME,
					env.COINBASE_API_KEY_PRIVATE_KEY,
					state.walletId
				);
				await postEphemeralWithButtons(
					channelId,
					userId,
					`💰 *Funding requested successfully!*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}\n*Balance:* ${balance} ETH\n*Transaction:* ${faucetTx.getTransactionHash()}`,
					env.SLACK_BOT_TOKEN,
					true
				);
			}
			break;
		}
		case 'remove_wallet': {
			await env.USER_STATE.delete(`user:${userId}`);
			await postEphemeralMessage(channelId, userId, '🗑️ *Wallet removed successfully!*', env.SLACK_BOT_TOKEN);
			break;
		}
	}
}
