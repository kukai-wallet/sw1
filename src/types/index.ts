export interface Env {
	SLACK_SIGNING_SECRET: string;
	SLACK_BOT_TOKEN: string;
	COINBASE_API_KEY_NAME: string;
	COINBASE_API_KEY_PRIVATE_KEY: string;
	OPENAI_API_KEY: string;
	USER_STATE: KVNamespace;
}

export interface SlackInteractionPayload {
	type: string;
	user: { id: string; username?: string };
	actions?: Array<{ value: string; action_id: string }>;
	response_url?: string;
	trigger_id?: string;
	channel?: { id: string };
	view?: {
		state: {
			values: {
				[blockId: string]: {
					[actionId: string]: {
						value?: string;
					};
				};
			};
		};
		private_metadata?: string;
	};
}

export interface UserState {
	walletId?: string;
	address?: string;
	network: string;
}

export interface WalletResponse {
	id: string;
	network_id: string;
	default_address: {
		address_id: string;
	};
}
