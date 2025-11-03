# Slack Wallet Bot - Setup Guide

A professional Slack bot for crypto wallet management using Coinbase Developer Platform with AI-powered natural language commands.

## Features

- **Interactive Wallet Management**: Create, view, fund, and remove crypto wallets
- **AI-Powered Commands**: Natural language interface via OpenAI GPT-4o-mini
- **Clean Architecture**: Modular codebase with utils, handlers, types, and constants
- **Public & Private Messaging**: Public commands, private ephemeral responses
- **Base Sepolia Testnet**: Safe testing environment

## Architecture

```
src/
├── index.ts                 # Main entry point with route handling
├── constants/
│   └── routes.ts            # Route enums
├── types/
│   └── index.ts             # TypeScript interfaces
├── utils/
│   ├── coinbase/
│   │   ├── jwt.ts           # JWT generation for Coinbase API
│   │   ├── create-wallet.ts # Wallet creation
│   │   └── fund-wallet.ts   # Wallet funding (faucet)
│   ├── slack/
│   │   ├── verify-request.ts # Request verification
│   │   └── post-message.ts  # Message helpers & modals
│   └── openai/
│       └── interpret.ts     # Natural language interpretation
└── handlers/
    └── wallet-actions.ts    # Wallet action handlers
```

## Prerequisites

### 1. Slack App Setup

Create app at https://api.slack.com/apps

**OAuth Scopes:**
- `chat:write`
- `chat:write.public`
- `commands`

**Slash Command:**
- `/wallet` → `https://your-worker.workers.dev/wallet`

**Interactive Components:**
- URL: `https://your-worker.workers.dev/slack/interactions`

**Event Subscriptions:**
- URL: `https://your-worker.workers.dev/slack/events`

### 2. Slack Credentials

**SLACK_SIGNING_SECRET**
- Location: Basic Information → App Credentials → Signing Secret

**SLACK_BOT_TOKEN**
- Location: OAuth & Permissions → Bot User OAuth Token
- Format: `xoxb-...`

### 3. Coinbase Developer Platform

1. Sign up at https://portal.cdp.coinbase.com/
2. Create project and API key
3. Download credentials JSON

**From JSON file:**
- `name` → `COINBASE_API_KEY_NAME`
- `privateKey` → `COINBASE_API_KEY_PRIVATE_KEY`

### 4. OpenAI API Key

1. Create account at https://platform.openai.com/
2. Generate API key

**OPENAI_API_KEY**
- Format: `sk-...`

## Deployment

### 1. Install Dependencies

```bash
yarn install
```

### 2. Create KV Namespace

```bash
yarn wrangler kv:namespace create USER_STATE
```

Update `wrangler.jsonc` with the KV namespace ID (already configured: `b3674559eeff42fbab2fd56c366bbdd5`)

### 3. Set Secrets

```bash
yarn wrangler secret put SLACK_SIGNING_SECRET
yarn wrangler secret put SLACK_BOT_TOKEN
yarn wrangler secret put COINBASE_API_KEY_NAME
yarn wrangler secret put COINBASE_API_KEY_PRIVATE_KEY
yarn wrangler secret put OPENAI_API_KEY
```

### 4. Local Development

```bash
yarn wrangler dev --port 8787 --local
```

### 5. Deploy to Production

```bash
yarn wrangler deploy
```

### 6. Update Slack URLs

After deployment, update your Slack app with the worker URL:
- Slash command: `https://your-worker.workers.dev/wallet`
- Interactivity: `https://your-worker.workers.dev/slack/interactions`
- Events: `https://your-worker.workers.dev/slack/events`

## Usage

### Slash Command

Type `/wallet` in any channel - displays wallet manager with buttons (public message)

### Button Actions

All buttons send **ephemeral** messages (visible only to you):
- **Create Wallet**: Provisions new wallet on Base Sepolia
- **Get Wallet**: Shows your wallet address
- **Fund Wallet**: Adds testnet ETH via faucet
- **Remove Wallet**: Deletes wallet data
- **AI Prompt**: Opens modal for natural language commands

### AI Prompts

Examples:
- "create a wallet"
- "show my wallet"
- "fund my wallet"
- "remove my wallet"

### Test Endpoints

**AI Interpretation:**
```bash
curl "https://your-worker.workers.dev/ai/interpret?prompt=create%20a%20wallet"
```

**Wallet Creation:**
```bash
curl "https://your-worker.workers.dev/test/create-wallet"
```

## Network Configuration

Currently: **Base Sepolia** (testnet)

Change in `src/handlers/wallet-actions.ts` and `src/utils/coinbase/create-wallet.ts`:
- `base-sepolia` (current)
- `base-mainnet`
- `ethereum-mainnet`
- Other EVM networks supported by Coinbase CDP

## Known Issues

### Coinbase JWT Authentication

The current implementation generates JWTs for Coinbase API authentication, but may encounter "unauthorized - invalid key" errors. This is due to the PKCS8 encoding of the EC private key from the base64 format provided by Coinbase.

**Workaround**: Verify your `COINBASE_API_KEY_PRIVATE_KEY` is correctly copied from the Coinbase CDP JSON file without any modifications.

## Code Quality

- ✅ TypeScript with strict typing
- ✅ Modular architecture with separated concerns
- ✅ Enum-based route management
- ✅ Professional error handling
- ✅ Clean, maintainable codebase

## Troubleshooting

**"Unauthorized - invalid key"**: Check Coinbase credentials match exactly from JSON file

**Modal not opening**: Verify `commands` scope and Interactivity enabled

**AI not understanding**: Use clear language like "create wallet", "show wallet"

**Messages not ephemeral**: Check `chat:write` scope is enabled
