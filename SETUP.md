# Clearhold - Step-by-Step Setup Guide

Follow these steps to get Clearhold running locally and deploy to production.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish setting up
3. Go to **Settings** → **API** and copy:
   - `Project URL`
   - `anon/public` key
   - `service_role` key (click "Reveal" to see it)
4. Keep these values for Step 4

## Step 3: Create Database Tables

1. In your Supabase project, go to **SQL Editor**
2. Open the file `supabase/migrations/001_initial_schema.sql` in this project
3. Copy ALL the contents
4. Paste into the Supabase SQL Editor
5. Click **Run** to execute
6. Verify success: Go to **Table Editor** and confirm you see:
   - `user_profiles`
   - `daily_usage`
   - `reflections`

## Step 4: Get OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API keys** (left sidebar)
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)
6. Keep this for Step 6

## Step 5: Set Up Stripe

1. Go to [stripe.com](https://stripe.com) and create an account
2. Go to **Developers** → **API keys**
3. Copy both:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
4. Keep these for Step 6

## Step 6: Create .env.local File

Create a file named `.env.local` in the root directory and add:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase (from Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Stripe (from Step 5)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note**: For now, use `whsec_local_test` as the webhook secret. We'll get the real one in Step 8.

## Step 7: Confirm .gitignore

Verify that `.env*` is in `.gitignore` (already done):

```bash
cat .gitignore | grep env
```

You should see: `.env*`

This ensures your `.env.local` file is NEVER committed to git.

## Step 8: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Test the application:
1. Click **Sign up** and create an account
2. Sign in with your credentials
3. Try the thought interrogation flow
4. Check your usage counter

## Step 9: Set Up Stripe Webhooks for Local Testing

### Option A: Use Stripe CLI (Recommended)

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases

   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret from the output (starts with `whsec_`)
5. Update `STRIPE_WEBHOOK_SECRET` in `.env.local`
6. Restart your dev server

### Option B: Test without webhooks

Skip this step and test subscriptions after deploying to Vercel (Step 11).

## Step 10: Test Subscription Flow

1. Click **Upgrade** in the header
2. Click **Subscribe now**
3. Use Stripe test card: `4242 4242 4242 4242`
4. Any future expiry date (e.g., 12/25)
5. Any CVC (e.g., 123)
6. Complete checkout
7. Verify your status shows "Pro Member"

## Step 11: Deploy to Vercel

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial Clearhold setup"
   git push origin main
   ```

2. Go to [vercel.com](https://vercel.com)
3. Click **Add New Project**
4. Select your repository
5. Add environment variables (copy from your `.env.local`):
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET` (we'll update this next)
   - `NEXT_PUBLIC_APP_URL` → Change to your Vercel URL (e.g., `https://clearhold.vercel.app`)
6. Click **Deploy**
7. Wait for deployment to complete
8. Copy your Vercel URL

## Step 12: Configure Production Stripe Webhook

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter URL: `https://your-vercel-url.vercel.app/api/stripe/webhook`
4. Click **Select events** and choose:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Click on the newly created webhook
7. Click **Reveal** under **Signing secret**
8. Copy the secret (starts with `whsec_`)
9. Go to Vercel → Your Project → **Settings** → **Environment Variables**
10. Find `STRIPE_WEBHOOK_SECRET` and click **Edit**
11. Paste the new webhook secret
12. Click **Save**
13. Go to **Deployments** and click **Redeploy** on the latest deployment

## Step 13: Test Production Deployment

1. Visit your Vercel URL
2. Create a new account
3. Complete a thought interrogation
4. Test the subscription flow
5. Verify everything works!

## Step 14: Switch to Production Stripe (When Ready)

When you're ready to accept real payments:

1. In Stripe, activate your account
2. Go to **Developers** → **API keys** (make sure you're NOT in test mode)
3. Get your production keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)
4. Update environment variables in Vercel:
   - `STRIPE_SECRET_KEY` → Use production secret key
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Use production publishable key
5. Create a new webhook for production (same as Step 12)
6. Update `STRIPE_WEBHOOK_SECRET` in Vercel
7. Redeploy

## Troubleshooting

### "Unauthorized" Error
- Make sure you're signed in
- Check Supabase environment variables are correct

### Subscription Not Working
- Verify Stripe webhook is configured correctly
- Check webhook signing secret matches in Vercel
- Look at Stripe Dashboard → **Developers** → **Webhooks** for webhook logs

### Database Errors
- Ensure you ran the migration SQL in Supabase SQL Editor
- Check that tables exist in Table Editor
- Verify the trigger function was created

### OpenAI Errors
- Verify your API key is correct
- Check you have credits in your OpenAI account
- Make sure you didn't hit rate limits

## Quick Reference

**Local Development**:
```bash
npm run dev
```

**Build for Production**:
```bash
npm run build
npm start
```

**Environment Files**:
- `.env.local` - Your local secrets (NOT committed)
- `.env.example` - Template file (committed)

**Important URLs**:
- Supabase: https://supabase.com
- OpenAI: https://platform.openai.com
- Stripe: https://stripe.com
- Vercel: https://vercel.com

## Success Checklist

- [ ] Dependencies installed
- [ ] Supabase project created
- [ ] Database tables created
- [ ] OpenAI API key obtained
- [ ] Stripe account set up
- [ ] `.env.local` file created with all keys
- [ ] `.gitignore` includes `.env*`
- [ ] App runs locally (`npm run dev`)
- [ ] Sign up and login working
- [ ] Thought interrogation flow working
- [ ] Usage tracking displaying correctly
- [ ] Stripe checkout working (local or production)
- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Production webhook configured
- [ ] Production site tested

## You're Done! 🎉

Your Clearhold application is now live. Users can sign up, examine their thoughts, and subscribe for unlimited access.
