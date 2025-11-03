import { Routes } from './constants/routes';
import type { Env, SlackInteractionPayload } from './types';
import { verifySlackRequest } from './utils/slack/verify-request';
import { createWalletButtons, openModal } from './utils/slack/post-message';
import { interpretPrompt } from './utils/openai/interpret';
import { createWalletWithSDK } from './utils/coinbase/sdk-wallet';
import {
	handleCreateWallet,
	handleGetWallet,
	handleFundWallet,
	handleRemoveWallet,
	handleAIAction,
} from './handlers/wallet-actions';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Slack Events (URL verification)
		if (url.pathname === Routes.SLACK_EVENTS && request.method === 'POST') {
			const body = await request.text();
			const payload = JSON.parse(body);

			if (payload.type === 'url_verification') {
				return new Response(JSON.stringify({ challenge: payload.challenge }), {
					headers: { 'Content-Type': 'application/json' },
				});
			}

			return new Response('OK', { status: 200 });
		}

		// Slack Interactions (Buttons & Modals)
		if (url.pathname === Routes.SLACK_INTERACTIONS && request.method === 'POST') {
			if (!(await verifySlackRequest(request, env.SLACK_SIGNING_SECRET))) {
				return new Response('Unauthorized', { status: 401 });
			}

			const formData = await request.formData();
			const payloadStr = formData.get('payload') as string;
			const payload: SlackInteractionPayload = JSON.parse(payloadStr);
			const userId = payload.user.id;

			// Handle modal submission (AI Prompt)
			if (payload.type === 'view_submission') {
				try {
					const promptText = payload.view?.state.values.prompt_input.prompt_text.value;
					if (!promptText) {
						return new Response(JSON.stringify({
							response_action: 'errors',
							errors: { prompt_input: 'Please enter a prompt' },
						}), {
							headers: { 'Content-Type': 'application/json' },
						});
					}

					const channelId = payload.view?.private_metadata || payload.user.id;
					const action = await interpretPrompt(promptText, env.OPENAI_API_KEY);
					await handleAIAction(userId, action, channelId, env);

					return new Response('', { status: 200 });
				} catch (error) {
					console.error('Error processing AI prompt:', error);
					return new Response(JSON.stringify({
						response_action: 'errors',
						errors: {
							prompt_input: error instanceof Error ? error.message : 'Failed to process request',
						},
					}), {
						headers: { 'Content-Type': 'application/json' },
					});
				}
			}

			// Handle button interactions
			const action = payload.actions?.[0]?.value;

			try {
				if (action === 'ai_prompt') {
					const channelId = payload.channel?.id || '';
					await openModal(payload.trigger_id!, channelId, env.SLACK_BOT_TOKEN);
					return new Response('', { status: 200 });
				}

				switch (action) {
					case 'create_wallet':
						await handleCreateWallet(userId, env, payload.response_url!);
						break;
					case 'get_wallet':
						await handleGetWallet(userId, env, payload.response_url!);
						break;
					case 'fund_wallet':
						await handleFundWallet(userId, env, payload.response_url!);
						break;
					case 'remove_wallet':
						await handleRemoveWallet(userId, env, payload.response_url!);
						break;
				}

				return new Response('', { status: 200 });
			} catch (error) {
				console.error('Error handling interaction:', error);
				return new Response('', { status: 200 });
			}
		}

		// Wallet Command (Slash command /wallet)
		if (url.pathname === Routes.WALLET && request.method === 'POST') {
			return new Response(JSON.stringify({
				response_type: 'in_channel',
				text: 'Manage your wallet',
				blocks: [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: '👋 *Welcome to Wallet Manager*\n\nChoose an option below to get started:',
						},
					},
					{
						type: 'actions',
						elements: createWalletButtons(false),
					},
				],
			}), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// AI Interpret Test Endpoint
		if (url.pathname === Routes.AI_INTERPRET && request.method === 'GET') {
			const prompt = url.searchParams.get('prompt');
			if (!prompt) {
				return new Response(JSON.stringify({ error: 'Missing prompt parameter' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			try {
				const action = await interpretPrompt(prompt, env.OPENAI_API_KEY);
				return new Response(JSON.stringify({ prompt, interpreted_action: action }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				return new Response(JSON.stringify({
					error: error instanceof Error ? error.message : 'Failed to interpret prompt',
				}), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		// Test Wallet Creation Endpoint
		if (url.pathname === Routes.TEST_CREATE_WALLET && request.method === 'GET') {
			try {
				const wallet = await createWalletWithSDK(
					env.COINBASE_API_KEY_NAME,
					env.COINBASE_API_KEY_PRIVATE_KEY,
					'base-sepolia'
				);

				return new Response(JSON.stringify({
					success: true,
					wallet: {
						id: wallet.id,
						network: wallet.network_id,
						address: wallet.default_address.address_id,
					},
				}), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				console.error('Wallet creation test failed:', error);
				return new Response(JSON.stringify({
					success: false,
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				}), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
