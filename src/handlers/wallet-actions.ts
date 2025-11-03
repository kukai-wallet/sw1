import { createWalletWithSDK } from '../utils/coinbase/sdk-wallet';
import { fundWallet } from '../utils/coinbase/fund-wallet';
import { postEphemeralMessage } from '../utils/slack/post-message';
import type { Env, UserState } from '../types';

export async function handleCreateWallet(
	userId: string,
	env: Env,
	responseUrl: string
): Promise<void> {
	const existing = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');

	if (existing?.walletId) {
		await fetch(responseUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				response_type: 'ephemeral',
				replace_original: false,
				text: `✅ *Wallet already exists!*\n\n*Address:* \`${existing.address}\`\n*Network:* ${existing.network}`,
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

	await fetch(responseUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			response_type: 'ephemeral',
			replace_original: false,
			text: `💼 *Your wallet:*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}`,
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

	await fundWallet(
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
			text: `💰 *Wallet funded successfully!*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}`,
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
	const sendEphemeral = async (text: string) => {
		await postEphemeralMessage(channelId, userId, text, env.SLACK_BOT_TOKEN);
	};

	switch (action) {
		case 'create_wallet': {
			const existing = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');
			if (existing?.walletId) {
				await sendEphemeral(`✅ *Wallet already exists!*\n\n*Address:* \`${existing.address}\`\n*Network:* ${existing.network}`);
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
				await sendEphemeral(`🎉 *Wallet created successfully!*\n\n*Address:* \`${wallet.default_address.address_id}\`\n*Network:* ${wallet.network_id}`);
			}
			break;
		}
		case 'get_wallet': {
			const state = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');
			if (!state?.walletId) {
				await sendEphemeral('❌ *No wallet found.* Create one first!');
			} else {
				await sendEphemeral(`💼 *Your wallet:*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}`);
			}
			break;
		}
		case 'fund_wallet': {
			const state = await env.USER_STATE.get<UserState>(`user:${userId}`, 'json');
			if (!state?.walletId) {
				await sendEphemeral('❌ *No wallet found.* Create one first!');
			} else {
				await fundWallet(
					env.COINBASE_API_KEY_NAME,
					env.COINBASE_API_KEY_PRIVATE_KEY,
					state.walletId
				);
				await sendEphemeral(`💰 *Wallet funded successfully!*\n\n*Address:* \`${state.address}\`\n*Network:* ${state.network}`);
			}
			break;
		}
		case 'remove_wallet': {
			await env.USER_STATE.delete(`user:${userId}`);
			await sendEphemeral('🗑️ *Wallet removed successfully!*');
			break;
		}
	}
}
