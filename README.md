# BeatDrop Studio

BeatDrop Studio is a React + Vite app for turning MP3 uploads into YouTube-ready type beat videos. It now includes a Stripe-backed BeatDrop Pro billing flow with:

- Stripe Checkout for new subscriptions
- Stripe Billing Portal for self-service plan management
- Webhook-driven subscription syncing
- A small local billing store for development
- Frontend plan gating for BeatDrop Pro features

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file and fill in your real values:

```bash
copy .env.example .env
```

Required values:

- `VITE_GOOGLE_CLIENT_ID`
- `APP_URL`
- `PORT`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

## Stripe dashboard setup

1. Create a recurring monthly or yearly BeatDrop Pro price in Stripe.
2. Put that price ID into `STRIPE_PRICE_ID`.
3. Enable and configure the Stripe Billing customer portal in your Stripe Dashboard.
4. Run a local webhook forwarder so Stripe events reach BeatDrop:

```bash
stripe listen --forward-to http://127.0.0.1:4242/api/billing/webhook
```

5. Copy the webhook signing secret from the Stripe CLI output into `STRIPE_WEBHOOK_SECRET`.

## Run the app

Run the frontend and Stripe backend together:

```bash
npm run dev
```

Frontend:

- `http://127.0.0.1:4173`

Backend:

- `http://127.0.0.1:4242`

## Billing endpoints

The new backend exposes:

- `GET /api/billing/config`
- `GET /api/billing/subscription-status?email=...`
- `POST /api/billing/create-checkout-session`
- `POST /api/billing/create-portal-session`
- `POST /api/billing/webhook`

## Production notes

- Replace the local JSON billing store with a real database before production.
- Validate authenticated users server-side before trusting email-based billing actions.
- Put the app behind HTTPS and set `APP_URL` to your live domain.
- Use your live Stripe keys and a live recurring price for BeatDrop Pro.
