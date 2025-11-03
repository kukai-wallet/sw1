# Slack Wallet Bot - Setup Guide

A Cloudflare Workers-based Slack bot that integrates with Coinbase Developer Platform to manage crypto wallets on Base Sepolia testnet.

## Architecture Overview

**Stack:**

- Cloudflare Workers (serverless compute)
- Cloudflare KV (user state storage)
- Slack Webhooks & Interactivity API
- Coinbase Developer Platform API v1

**Features:**

- Create wallets per Slack user
- Retrieve wallet information
- Fund wallets from testnet faucet
- Remove wallet associations
- Persistent state via KV storage

## File Structure

```
/src/index.ts          - Main worker with all business logic
/wrangler.jsonc        - Cloudflare configuration
/.dev.vars             - Local development secrets (DO NOT COMMIT)
/REQUIREMENTS.md       - What you need to provide
/SETUP.md             - This file
```

## Setup Process

### Step 1: Install Dependencies

```bash
yarn install
```

### Step 2: Create Cloudflare KV Namespace

```bash
wrangler kv:namespace create USER_STATE
```

Output will look like:

```
{ binding = "USER_STATE", id = "abc123def456" }
```

Update `wrangler.jsonc` line 36 with the actual ID:

```json
"kv_namespaces": [
  {
    "binding": "USER_STATE",
    "id": "abc123def456",
    "preview_id": "abc123def456"
  }
]
```

### Step 3: Configure Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it (e.g., "Wallet Manager") and select your workspace
4. Navigate to "OAuth & Permissions":
   - Add Bot Token Scopes: `chat:write`, `commands`, `incoming-webhook`
   - Install to workspace
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)
5. Navigate to "Basic Information":
   - Copy the "Signing Secret"
6. Navigate to "Slash Commands":
   - Create command `/wallet`
   - Request URL: `https://your-worker.workers.dev/wallet` (update after deployment)
   - Short description: "Manage your crypto wallet"
7. Navigate to "Interactivity & Shortcuts":
   - Enable Interactivity
   - Request URL: `https://your-worker.workers.dev/slack/interactions` (update after deployment)
8. Navigate to "Event Subscriptions":
   - Enable Events
   - Request URL: `https://your-worker.workers.dev/slack/events` (update after deployment)

### Step 4: Configure Coinbase Developer Platform

1. Sign up at https://portal.cdp.coinbase.com/
2. Create a project
3. Navigate to API Keys
4. Click "Create API Key"
5. Download the JSON file
6. Extract:
   - `name` field → `COINBASE_API_KEY_NAME`
   - `privateKey` field → `COINBASE_API_KEY_PRIVATE_KEY`

### Step 5: Configure Environment Variables

Update `.dev.vars` with your actual credentials:

```env
SLACK_SIGNING_SECRET=your_actual_signing_secret
SLACK_BOT_TOKEN=xoxb-your-actual-bot-token
COINBASE_API_KEY_NAME=organizations/your-org-id/apiKeys/your-key-id
COINBASE_API_KEY_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
your-actual-private-key-content
-----END EC PRIVATE KEY-----"
```

### Step 6: Local Development

```bash
yarn dev
```

This starts the worker locally. Use a tool like `ngrok` to expose it:

```bash
ngrok http 8787
```

Update Slack app URLs with the ngrok URL (e.g., `https://abc123.ngrok.io/slack/interactions`).

### Step 7: Deploy to Production

```bash
# Set production secrets
wrangler secret put SLACK_SIGNING_SECRET
wrangler secret put SLACK_BOT_TOKEN
wrangler secret put COINBASE_API_KEY_NAME
wrangler secret put COINBASE_API_KEY_PRIVATE_KEY

# Deploy
yarn deploy
```

After deployment, update Slack app URLs with your actual worker URL.

## How It Works

### Endpoints

**`POST /wallet`**

- Slack slash command handler
- Returns interactive message with wallet buttons

**`POST /slack/events`**

- Handles Slack event subscriptions
- Responds to URL verification challenge

**`POST /slack/interactions`**

- Handles button click interactions
- Verifies request signature
- Routes to appropriate wallet action

### User Flow

1. User types `/wallet` in Slack
2. Bot responds with buttons: "Create Wallet" and "Get Wallet"
3. User clicks "Create Wallet":
   - Worker calls Coinbase API to create wallet on Base Sepolia
   - Stores `{walletId, address, network}` in KV with key `user:{slackUserId}`
   - Updates message with wallet info and new buttons: "Get Wallet", "Fund Wallet", "Remove Wallet"
4. If user clicks "Create Wallet" again:
   - Worker checks KV for existing wallet
   - Returns existing address instead of creating new one
5. User clicks "Fund Wallet":
   - Worker calls Coinbase faucet API
   - Testnet ETH sent to wallet address
6. User clicks "Remove Wallet":
   - Worker deletes KV entry
   - User can create new wallet

### Security

**Slack Request Verification:**

- All `/slack/interactions` requests are verified using HMAC-SHA256
- Implementation in `verifySlackRequest()` (lines 110-145)
- Prevents unauthorized requests

**Coinbase API Authentication:**

- Uses ECDSA signature with P-256 curve
- Each request signed with private key
- Implementation in `CoinbaseClient.sign()` (lines 39-65)

### Storage Schema

**KV Key:** `user:{slackUserId}`

**Value Structure:**

```typescript
{
  walletId: string,      // Coinbase wallet ID
  address: string,       // Wallet address (0x...)
  network: string        // Network ID (base-sepolia)
}
```

## Testing

1. In Slack, type `/wallet`
2. Click "Create Wallet" - should create new wallet
3. Click "Get Wallet" - should display wallet info
4. Click "Fund Wallet" - should fund from faucet
5. Click "Remove Wallet" - should delete association
6. Type `/wallet` again and click "Create Wallet" - should create new wallet

## Troubleshooting

**"Unauthorized" error on interactions:**

- Check `SLACK_SIGNING_SECRET` is correct
- Ensure system time is synchronized

**Coinbase API errors:**

- Verify API key format in `.dev.vars`
- Check private key includes BEGIN/END markers
- Ensure API key has wallet creation permissions

**KV errors:**

- Verify KV namespace ID in `wrangler.jsonc`
- Check KV namespace exists in Cloudflare dashboard

**Worker not responding:**

- Check deployment status: `wrangler deployments list`
- View logs: `wrangler tail`

## Network Configuration

Currently using **Base Sepolia** (testnet). To change network, update line 230 in `src/index.ts`:

```typescript
const wallet = await coinbase.createWallet('base-sepolia');
```

Supported networks:

- `ethereum-mainnet`
- `base-mainnet`
- `base-sepolia` (current, testnet)

## Code Structure

**Interfaces & Types (lines 1-27):**

- `Env` - Environment bindings
- `SlackInteractionPayload` - Slack webhook payload
- `UserState` - KV storage schema
- `CoinbaseWallet` - Coinbase API response

**CoinbaseClient Class (lines 29-108):**

- `sign()` - ECDSA signature generation
- `request()` - Authenticated API requests
- `createWallet()` - Create new wallet
- `getWallet()` - Retrieve wallet info
- `fundWallet()` - Request testnet funds

**Utilities (lines 110-198):**

- `verifySlackRequest()` - Slack signature verification
- `postToSlack()` - Send responses to Slack
- `createWalletButtons()` - Generate button arrays

**Action Handlers (lines 200-401):**

- `handleCreateWallet()` - Create or return existing wallet
- `handleGetWallet()` - Display wallet info
- `handleFundWallet()` - Request faucet funds
- `handleRemoveWallet()` - Delete KV entry

**Main Handler (lines 403-505):**

- Route requests to appropriate endpoints
- Handle URL verification
- Process button interactions

## Production Considerations

1. **Rate Limiting:** Consider adding rate limits per user
2. **Error Handling:** Currently logs to console, consider external monitoring
3. **Wallet Security:** Wallets are managed by Coinbase, keys not exposed
4. **Data Retention:** Consider implementing wallet cleanup for inactive users
5. **Monitoring:** Use Cloudflare Analytics and Logpush for observability

## Next Steps

- Add transaction history viewing
- Implement wallet balance checks
- Support multiple networks per user
- Add admin commands
- Implement wallet export functionality
