# Clearhold - CBT Thought Interrogation Tool

A Next.js application that helps users examine looping thoughts using CBT (Cognitive Behavioral Therapy) techniques. Features user authentication, usage tracking, and a subscription payment system.

## Features

- **User Authentication**: Secure sign-up and login with Supabase
- **Thought Interrogation Flow**: Three-step process to examine thoughts
  - Step A: Classify as Fact, Thought, or Prediction
  - Step B: Select 1-2 cognitive distortions
  - Step C: Evidence-based questioning
- **AI-Powered Analysis**: OpenAI-generated structured responses
- **Usage Limits**: 5 free reflections per day for free users
- **Subscription System**: $1/month for unlimited access via Stripe
- **Usage Tracking**: Real-time display of remaining daily uses

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Authentication & Database**: Supabase
- **Payments**: Stripe
- **AI**: OpenAI API
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- An OpenAI API account
- A Stripe account
- A Vercel account (for deployment)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd clearhold
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** and copy:
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - Anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Service role key (SUPABASE_SERVICE_ROLE_KEY)
3. Go to **SQL Editor** and run the migration file:
   - Copy the contents of `supabase/migrations/001_initial_schema.sql`
   - Execute it in the SQL Editor
4. Verify tables were created: `user_profiles`, `daily_usage`, `reflections`

### 3. Set Up OpenAI

1. Create an account at [platform.openai.com](https://platform.openai.com)
2. Generate an API key at **API Keys** section
3. Copy the key (starts with `sk-`)

### 4. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from **Developers** → **API keys**:
   - Publishable key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
   - Secret key (STRIPE_SECRET_KEY)
3. **Create a webhook** (for local testing, skip this and use Stripe CLI):
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - For production: `https://your-domain.vercel.app/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the webhook signing secret (STRIPE_WEBHOOK_SECRET)

### 5. Create Environment Variables

Create a `.env.local` file in the root directory:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: The `.env.local` file is already in `.gitignore` and will NOT be committed.

### 6. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 7. Test Stripe Webhooks Locally (Optional)

Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Other platforms: https://stripe.com/docs/stripe-cli
```

Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret from the CLI output and update `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New Project**
3. Import your GitHub repository
4. Configure environment variables in **Environment Variables** section:
   - Add ALL variables from `.env.local`
   - Update `NEXT_PUBLIC_APP_URL` to your Vercel domain (e.g., `https://clearhold.vercel.app`)
5. Click **Deploy**

### 3. Set Up Production Stripe Webhook

1. After deployment, copy your Vercel URL
2. Go to Stripe Dashboard → **Developers** → **Webhooks**
3. Click **Add endpoint**
4. URL: `https://your-vercel-domain.vercel.app/api/stripe/webhook`
5. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
6. Copy the webhook signing secret
7. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables:
   - Go to **Settings** → **Environment Variables**
   - Update the `STRIPE_WEBHOOK_SECRET` value
   - Redeploy the application

### 4. Switch to Production Stripe Keys

When ready for production:
1. Get production API keys from Stripe (not test keys)
2. Update environment variables in Vercel:
   - `STRIPE_SECRET_KEY` (use `sk_live_...`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (use `pk_live_...`)
3. Redeploy

## Project Structure

```
clearhold/
├── app/
│   ├── api/
│   │   ├── reflect/route.ts          # AI reflection processing
│   │   └── stripe/
│   │       ├── checkout/route.ts     # Create checkout session
│   │       └── webhook/route.ts      # Handle Stripe webhooks
│   ├── login/page.tsx                # Login page
│   ├── signup/page.tsx               # Sign up page
│   ├── subscribe/page.tsx            # Subscription page
│   ├── page.tsx                      # Main thought flow
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Global styles
├── components/
│   └── ProtectedRoute.tsx            # Auth guard component
├── contexts/
│   └── AuthContext.tsx               # Authentication context
├── lib/
│   ├── supabase.ts                   # Supabase client
│   └── stripe.ts                     # Stripe client
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Database schema
├── .env.example                       # Environment variables template
├── .env.local                         # Your local environment (not committed)
└── package.json
```

## Usage

1. **Sign Up**: Create an account at `/signup`
2. **Sign In**: Log in at `/login`
3. **Examine Thoughts**:
   - Enter a looping thought
   - Complete the three-step flow
   - Receive AI-generated analysis
4. **Track Usage**: See remaining daily uses in header
5. **Subscribe**: Upgrade to Pro for unlimited access at `/subscribe`

## Database Schema

### user_profiles
- `id`: UUID (references auth.users)
- `email`: Text
- `clarity_points`: Integer
- `subscription_status`: Text (free/active/canceled/past_due)
- `stripe_customer_id`: Text
- `stripe_subscription_id`: Text

### daily_usage
- `id`: UUID
- `user_id`: UUID (references auth.users)
- `usage_date`: Date
- `usage_count`: Integer

### reflections
- `id`: UUID
- `user_id`: UUID (references auth.users)
- `thought`: Text
- `classification`: Text
- `chosen_distortions`: Text[]
- `evidence_choice`: Text
- `ai_response`: JSONB

## API Routes

### POST /api/reflect
Process a thought and return AI-generated analysis.

**Auth**: Required (Bearer token)

**Request**:
```json
{
  "thought": "string",
  "classification": "Fact" | "Thought" | "Prediction",
  "chosen_distortions": ["string"],
  "evidence_choice": "Yes" | "No" | "Unclear"
}
```

**Response**:
```json
{
  "type": "string",
  "distortions": ["string"],
  "assumptions_vs_facts": "string",
  "grounded_reframe": "string"
}
```

### POST /api/stripe/checkout
Create a Stripe checkout session.

**Auth**: Required (Bearer token)

**Response**:
```json
{
  "sessionId": "string",
  "url": "string"
}
```

### POST /api/stripe/webhook
Handle Stripe webhook events (checkout completion, subscription updates).

**Auth**: Stripe signature verification

## Security Notes

- All environment variables with secrets are in `.env.local` (never committed)
- Supabase Row Level Security (RLS) is enabled on all tables
- API routes verify user authentication before processing
- Stripe webhooks verify signatures before processing events
- Service role key is only used server-side for admin operations

## Troubleshooting

### "Unauthorized" errors
- Ensure you're logged in
- Check that Supabase environment variables are correct
- Verify the auth token is being sent in requests

### Stripe webhook not working
- Verify webhook URL is correct in Stripe dashboard
- Check that `STRIPE_WEBHOOK_SECRET` matches the webhook in Stripe
- For local testing, use Stripe CLI to forward webhooks

### Database errors
- Ensure the migration SQL has been run in Supabase
- Check that RLS policies are enabled
- Verify user profile is created on signup (check trigger)

### OpenAI API errors
- Verify `OPENAI_API_KEY` is correct and valid
- Check your OpenAI account has credits
- Ensure you're using a model you have access to (gpt-4-turbo-preview)

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
