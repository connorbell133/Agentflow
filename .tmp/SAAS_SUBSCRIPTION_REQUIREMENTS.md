# SaaS Subscription Platform Requirements

**Platform:** AgentFlow (Open Source + Hosted SaaS)
**Authentication:** Better-Auth + Supabase
**Date:** January 22, 2026
**Status:** Requirements Analysis

---

## Executive Summary

This document outlines the complete requirements for transforming AgentFlow from an open-source platform into a dual-offering: self-hosted open-source AND fully-hosted SaaS with subscription management.

**Business Model:**

- **Open Source:** Free self-hosted version (AGPL-3.0)
- **Hosted SaaS:** Subscription-based tiers with managed infrastructure

**Key Requirements:**

1. Stripe integration for payment processing
2. Multi-tier subscription system (Free, Pro, Enterprise)
3. Usage tracking and enforcement
4. Feature gating per subscription tier
5. Customer portal for subscription management
6. Webhook handling for payment events
7. Compliance and legal framework

---

## Table of Contents

1. [Subscription Tiers & Pricing](#1-subscription-tiers--pricing)
2. [Database Schema Extensions](#2-database-schema-extensions)
3. [Better-Auth Integration](#3-better-auth-integration)
4. [Stripe Integration](#4-stripe-integration)
5. [API Endpoints Required](#5-api-endpoints-required)
6. [UI Components Required](#6-ui-components-required)
7. [Feature Gating System](#7-feature-gating-system)
8. [Usage Tracking & Limits](#8-usage-tracking--limits)
9. [Billing & Invoicing](#9-billing--invoicing)
10. [Customer Experience Flows](#10-customer-experience-flows)
11. [Administrative Features](#11-administrative-features)
12. [Compliance & Legal](#12-compliance--legal)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Cost Estimates](#14-cost-estimates)

---

## 1. Subscription Tiers & Pricing

### Recommended Tier Structure

```yaml
Tiers:
  Free:
    price: $0/month
    features:
      - 1 organization
      - 3 users max
      - 100 conversations/month
      - 1 custom AI model
      - Community support
      - Basic analytics
    limits:
      conversations: 100
      users: 3
      models: 1
      storage_gb: 1

  Pro:
    price: $29/month (or $290/year)
    features:
      - 1 organization
      - 20 users
      - 2,000 conversations/month
      - 10 custom AI models
      - Priority email support
      - Advanced analytics
      - Custom branding
      - API access
    limits:
      conversations: 2000
      users: 20
      models: 10
      storage_gb: 50

  Enterprise:
    price: Custom (starting at $299/month)
    features:
      - Unlimited organizations
      - Unlimited users
      - Unlimited conversations
      - Unlimited models
      - Dedicated support
      - SSO/SAML
      - Custom integrations
      - SLA guarantee
      - White-label option
    limits:
      conversations: -1 # unlimited
      users: -1
      models: -1
      storage_gb: 500
```

### Add-ons (Optional Revenue Streams)

```yaml
AddOns:
  - name: 'Additional Storage'
    price: $10/month per 10GB

  - name: 'Additional Users'
    price: $5/user/month

  - name: 'AI Model Training'
    price: $100/model (one-time)

  - name: 'Advanced Analytics'
    price: $50/month

  - name: 'Custom Integration Development'
    price: $500+ (custom quote)
```

---

## 2. Database Schema Extensions

### New Tables Required

```sql
-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Relationships
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  -- Stripe data
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Plan information
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')),

  -- Billing cycle
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,

  -- Trial information
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,

  -- Pricing
  amount_monthly INTEGER, -- in cents
  currency TEXT DEFAULT 'usd',

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org subscription"
  ON subscriptions FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Only org owners can modify subscription"
  ON subscriptions FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM user_organizations
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly INTEGER NOT NULL, -- in cents
  price_yearly INTEGER, -- in cents (if annual billing)
  currency TEXT DEFAULT 'usd',

  -- Stripe data
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  stripe_product_id TEXT,

  -- Feature limits (JSONB for flexibility)
  features JSONB NOT NULL DEFAULT '{
    "conversations_per_month": 100,
    "users_max": 3,
    "models_max": 1,
    "storage_gb": 1,
    "api_access": false,
    "custom_branding": false,
    "priority_support": false,
    "sso": false,
    "analytics_advanced": false
  }',

  -- Display
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, display_name, price_monthly, features) VALUES
('free', 'Free', 'Free', 0, '{
  "conversations_per_month": 100,
  "users_max": 3,
  "models_max": 1,
  "storage_gb": 1,
  "api_access": false,
  "custom_branding": false,
  "priority_support": false
}'),
('pro', 'Pro', 'Pro', 2900, '{
  "conversations_per_month": 2000,
  "users_max": 20,
  "models_max": 10,
  "storage_gb": 50,
  "api_access": true,
  "custom_branding": true,
  "priority_support": true
}'),
('enterprise', 'Enterprise', 'Enterprise', 29900, '{
  "conversations_per_month": -1,
  "users_max": -1,
  "models_max": -1,
  "storage_gb": 500,
  "api_access": true,
  "custom_branding": true,
  "priority_support": true,
  "sso": true,
  "analytics_advanced": true
}');

-- ============================================
-- USAGE TRACKING TABLE
-- ============================================
CREATE TABLE usage_tracking (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Relationships
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Usage metrics
  metric_type TEXT NOT NULL CHECK (metric_type IN ('conversation', 'user', 'model', 'storage', 'api_call')),
  metric_value INTEGER NOT NULL DEFAULT 1,

  -- Time period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_usage_org_metric ON usage_tracking(org_id, metric_type, period_start);
CREATE INDEX idx_usage_subscription ON usage_tracking(subscription_id);
CREATE INDEX idx_usage_recorded_at ON usage_tracking(recorded_at);

-- ============================================
-- BILLING HISTORY TABLE
-- ============================================
CREATE TABLE billing_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Relationships
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Stripe data
  stripe_invoice_id TEXT UNIQUE,
  stripe_charge_id TEXT,

  -- Invoice details
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),

  -- Dates
  invoice_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- PDF/Details
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_org ON billing_history(org_id);
CREATE INDEX idx_billing_subscription ON billing_history(subscription_id);
CREATE INDEX idx_billing_stripe_invoice ON billing_history(stripe_invoice_id);

-- ============================================
-- FEATURE FLAGS TABLE (Optional but Recommended)
-- ============================================
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Feature identification
  feature_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Enablement
  is_enabled_globally BOOLEAN DEFAULT FALSE,
  required_plan TEXT[], -- Array of plan IDs that have access

  -- Rollout
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default feature flags
INSERT INTO feature_flags (feature_key, name, required_plan) VALUES
('api_access', 'API Access', ARRAY['pro', 'enterprise']),
('custom_branding', 'Custom Branding', ARRAY['pro', 'enterprise']),
('sso', 'Single Sign-On', ARRAY['enterprise']),
('advanced_analytics', 'Advanced Analytics', ARRAY['pro', 'enterprise']),
('priority_support', 'Priority Support', ARRAY['pro', 'enterprise']);

-- ============================================
-- PAYMENT METHODS TABLE
-- ============================================
CREATE TABLE payment_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Relationships
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  -- Stripe data
  stripe_payment_method_id TEXT NOT NULL UNIQUE,

  -- Card details (last 4, brand, etc.)
  type TEXT NOT NULL, -- 'card', 'bank_account', etc.
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Status
  is_default BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_methods_org ON payment_methods(org_id);
CREATE INDEX idx_payment_methods_stripe ON payment_methods(stripe_payment_method_id);

-- ============================================
-- COUPONS/DISCOUNTS TABLE (Optional)
-- ============================================
CREATE TABLE coupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Stripe data
  stripe_coupon_id TEXT UNIQUE,

  -- Coupon details
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL, -- percentage or cents

  -- Validity
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,

  -- Restrictions
  applicable_plans TEXT[], -- NULL = all plans
  first_time_only BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- APPLIED COUPONS TABLE
-- ============================================
CREATE TABLE applied_coupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Relationships
  coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Application details
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

### Schema Updates to Existing Tables

```sql
-- ============================================
-- UPDATE ORGANIZATIONS TABLE
-- ============================================
ALTER TABLE organizations
  ADD COLUMN subscription_id TEXT REFERENCES subscriptions(id),
  ADD COLUMN current_plan TEXT REFERENCES subscription_plans(id) DEFAULT 'free',
  ADD COLUMN stripe_customer_id TEXT UNIQUE;

CREATE INDEX idx_organizations_subscription ON organizations(subscription_id);
CREATE INDEX idx_organizations_plan ON organizations(current_plan);

-- ============================================
-- UPDATE USER TABLE
-- ============================================
ALTER TABLE "user"
  ADD COLUMN stripe_customer_id TEXT UNIQUE,
  ADD COLUMN is_paying_customer BOOLEAN DEFAULT FALSE;
```

---

## 3. Better-Auth Integration

### Extend Better-Auth User Model

```typescript
// src/lib/auth/better-auth.ts
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },

  // Password hashing
  password: {
    hash: async (password: string) => await bcrypt.hash(password, 10),
    verify: async ({ hash, password }) => await bcrypt.compare(password, hash),
  },

  // Session configuration
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 7 },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },

  // Extended user fields for subscription
  user: {
    additionalFields: {
      orgId: {
        type: 'string',
        required: false,
      },
      currentPlan: {
        type: 'string',
        required: false,
        defaultValue: 'free',
      },
      stripeCustomerId: {
        type: 'string',
        required: false,
      },
      isPayingCustomer: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      subscriptionStatus: {
        type: 'string',
        required: false,
      },
      trialEndsAt: {
        type: 'date',
        required: false,
      },
    },
  },

  // Webhooks for subscription updates
  hooks: {
    after: {
      signUp: async ({ user }) => {
        // Create default free subscription
        await createFreeSubscription(user.id);
      },
    },
  },
});

// Helper function to create free subscription
async function createFreeSubscription(userId: string) {
  // Implementation in next section
}
```

### Session Enhancement with Subscription Data

```typescript
// src/lib/auth/server.ts
import { headers } from 'next/headers';
import { auth as betterAuth } from './better-auth';

const USER_ID_HEADER = 'x-user-id';
const ORG_ID_HEADER = 'x-org-id';
const PLAN_HEADER = 'x-plan';
const SUBSCRIPTION_STATUS_HEADER = 'x-subscription-status';

export interface AuthContext {
  userId: string | null;
  org_id: string | null;
  currentPlan?: string;
  subscriptionStatus?: string;
  isPayingCustomer?: boolean;
}

export async function auth(): Promise<AuthContext> {
  const headersList = await headers();
  const userId = headersList.get(USER_ID_HEADER);
  const org_id = headersList.get(ORG_ID_HEADER);
  const currentPlan = headersList.get(PLAN_HEADER);
  const subscriptionStatus = headersList.get(SUBSCRIPTION_STATUS_HEADER);

  return {
    userId,
    org_id,
    currentPlan: currentPlan || 'free',
    subscriptionStatus: subscriptionStatus || undefined,
    isPayingCustomer: currentPlan !== 'free',
  };
}

export async function currentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const session = await betterAuth.api.getSession({
      headers: await headers(),
    });
    return session?.user || null;
  } catch (error) {
    console.error('[Auth] Error getting current user:', error);
    return null;
  }
}

// NEW: Get subscription context
export async function getSubscriptionContext() {
  const authContext = await auth();
  if (!authContext.userId || !authContext.org_id) {
    return null;
  }

  // Fetch subscription from database
  const subscription = await getOrgSubscription(authContext.org_id);

  return {
    ...authContext,
    subscription,
    features: subscription?.plan?.features || {},
  };
}
```

### Middleware Update for Subscription

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/better-auth';
import { getOrgSubscription } from '@/lib/subscription/subscription-helpers';

export async function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  const session = await auth.api.getSession({ headers });

  let userId = null;
  let orgId = null;
  let currentPlan = 'free';
  let subscriptionStatus = 'active';

  if (session?.user) {
    userId = session.user.id;
    orgId = session.user.orgId || null;

    // Fetch subscription data
    if (orgId) {
      const subscription = await getOrgSubscription(orgId);
      currentPlan = subscription?.plan_id || 'free';
      subscriptionStatus = subscription?.status || 'active';
    }
  }

  // Pass to server components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', userId || '');
  requestHeaders.set('x-org-id', orgId || '');
  requestHeaders.set('x-plan', currentPlan);
  requestHeaders.set('x-subscription-status', subscriptionStatus);

  // Check if route requires paid plan
  if (requiresPaidPlan(req.nextUrl.pathname) && currentPlan === 'free') {
    return NextResponse.redirect(new URL('/pricing', req.url));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function requiresPaidPlan(pathname: string): boolean {
  const paidRoutes = ['/api/advanced', '/admin/analytics/advanced', '/custom-branding'];
  return paidRoutes.some(route => pathname.startsWith(route));
}
```

---

## 4. Stripe Integration

### Installation & Setup

```bash
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

### Stripe Server Client

```typescript
// src/lib/stripe/stripe-server.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Helper to create or retrieve customer
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const user = await getUserById(userId);

  // Return existing customer if already created
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  });

  // Save to database
  await updateUser(userId, {
    stripe_customer_id: customer.id,
  });

  return customer.id;
}

// Create checkout session for subscription
export async function createCheckoutSession(
  userId: string,
  orgId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const user = await getUserById(userId);
  const customerId = await getOrCreateStripeCustomer(userId, user.email, user.name);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      orgId,
    },
    subscription_data: {
      metadata: {
        userId,
        orgId,
      },
      trial_period_days: 14, // Optional: 14-day trial
    },
  });

  return session;
}

// Create portal session for subscription management
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });

  return subscription;
}

// Update subscription plan
export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'always_invoice', // Pro-rate the difference
  });

  return updatedSubscription;
}
```

### Stripe Client (React)

```typescript
// src/lib/stripe/stripe-client.ts
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};
```

### Webhook Handler

```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/stripe-server';
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from '@/lib/subscription/webhook-handlers';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          await handleCheckoutCompleted(session);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Webhook Handlers
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, orgId } = session.metadata || {};

  if (!userId || !orgId) {
    throw new Error('Missing metadata in checkout session');
  }

  // Create subscription record in database
  await createSubscription({
    org_id: orgId,
    user_id: userId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: session.subscription as string,
  });
}
```

---

## 5. API Endpoints Required

### Subscription Management Endpoints

```typescript
// src/app/api/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getOrgSubscription } from '@/lib/subscription/subscription-helpers';

// GET /api/subscriptions - Get current subscription
export async function GET(req: NextRequest) {
  const { userId, org_id } = await auth();

  if (!userId || !org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscription = await getOrgSubscription(org_id);

  return NextResponse.json({ subscription });
}

// POST /api/subscriptions/checkout - Create checkout session
export async function POST(req: NextRequest) {
  const { userId, org_id } = await auth();

  if (!userId || !org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { priceId } = await req.json();

  const session = await createCheckoutSession(
    userId,
    org_id,
    priceId,
    `${process.env.NEXT_PUBLIC_APP_URL}/admin?tab=billing&success=true`,
    `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
  );

  return NextResponse.json({ sessionId: session.id });
}
```

```typescript
// src/app/api/subscriptions/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { cancelSubscription } from '@/lib/stripe/stripe-server';
import { getOrgSubscription } from '@/lib/subscription/subscription-helpers';

export async function POST(req: NextRequest) {
  const { userId, org_id } = await auth();

  if (!userId || !org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscription = await getOrgSubscription(org_id);

  if (!subscription?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
  }

  await cancelSubscription(subscription.stripe_subscription_id);

  return NextResponse.json({ success: true });
}
```

```typescript
// src/app/api/subscriptions/portal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { createPortalSession } from '@/lib/stripe/stripe-server';
import { getUserById } from '@/actions/auth/users';

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(userId);

  if (!user.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
  }

  const session = await createPortalSession(
    user.stripe_customer_id,
    `${process.env.NEXT_PUBLIC_APP_URL}/admin?tab=billing`
  );

  return NextResponse.json({ url: session.url });
}
```

### Usage Tracking Endpoints

```typescript
// src/app/api/usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { getOrgUsage } from '@/lib/subscription/usage-tracking';

export async function GET(req: NextRequest) {
  const { userId, org_id } = await auth();

  if (!userId || !org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const period = searchParams.get('period') || 'current'; // 'current', 'last_month', etc.

  const usage = await getOrgUsage(org_id, period);

  return NextResponse.json({ usage });
}
```

---

## 6. UI Components Required

### Pricing Page Component

```typescript
// src/components/features/pricing/PricingPage.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useSession } from '@/lib/auth/better-auth-client';
import { useRouter } from 'next/navigation';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  stripePriceId: string;
}

const tiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out AgentFlow',
    features: [
      '1 organization',
      '3 users max',
      '100 conversations/month',
      '1 custom AI model',
      'Community support',
      'Basic analytics',
    ],
    cta: 'Get Started',
    stripePriceId: '',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    description: 'For growing teams and businesses',
    features: [
      '1 organization',
      '20 users',
      '2,000 conversations/month',
      '10 custom AI models',
      'Priority email support',
      'Advanced analytics',
      'Custom branding',
      'API access',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO!,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Unlimited organizations',
      'Unlimited users',
      'Unlimited conversations',
      'Unlimited models',
      'Dedicated support',
      'SSO/SAML',
      'Custom integrations',
      'SLA guarantee',
      'White-label option',
    ],
    cta: 'Contact Sales',
    stripePriceId: '',
  },
];

export function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);

  const handleSubscribe = async (tier: PricingTier) => {
    if (!session?.user) {
      router.push('/sign-up');
      return;
    }

    if (tier.id === 'free') {
      router.push('/admin');
      return;
    }

    if (tier.id === 'enterprise') {
      window.location.href = 'mailto:sales@agentflow.live?subject=Enterprise Plan Inquiry';
      return;
    }

    setLoading(tier.id);

    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: tier.stripePriceId }),
      });

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      await stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground">
          Choose the plan that's right for you
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <Card
            key={tier.id}
            className={`p-8 ${
              tier.highlighted
                ? 'border-primary shadow-lg scale-105'
                : 'border-border'
            }`}
          >
            {tier.highlighted && (
              <div className="text-center mb-4">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              <div className="mb-2">
                <span className="text-4xl font-bold">{tier.price}</span>
                {tier.price !== 'Custom' && (
                  <span className="text-muted-foreground">/month</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {tier.description}
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleSubscribe(tier)}
              disabled={loading === tier.id}
              className="w-full"
              variant={tier.highlighted ? 'default' : 'outline'}
            >
              {loading === tier.id ? 'Loading...' : tier.cta}
            </Button>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          All plans include 14-day free trial. No credit card required.
        </p>
      </div>
    </div>
  );
}
```

### Subscription Management Dashboard

```typescript
// src/components/features/billing/SubscriptionDashboard.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';

interface SubscriptionData {
  plan: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  usage: {
    conversations: { used: number; limit: number };
    users: { used: number; limit: number };
    storage: { used: number; limit: number };
  };
}

export function SubscriptionDashboard() {
  const router = useRouter();
  const [subscription, setSubscription] = React.useState<SubscriptionData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      const data = await response.json();
      setSubscription(data.subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Subscription</h2>
            <p className="text-muted-foreground">
              Manage your billing and subscription
            </p>
          </div>
          <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
            {subscription?.status}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
            <p className="text-2xl font-bold capitalize">{subscription?.plan}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Billing Period</p>
            <p className="text-lg">
              Renews {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}
            </p>
          </div>
          <div>
            <Button onClick={handleManageBilling} className="w-full">
              Manage Billing
            </Button>
          </div>
        </div>

        {subscription?.cancelAtPeriodEnd && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
            <p className="text-sm text-yellow-800">
              Your subscription will be canceled at the end of the billing period.
            </p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Usage This Month</h3>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Conversations</span>
              <span className="text-sm text-muted-foreground">
                {subscription?.usage.conversations.used} / {subscription?.usage.conversations.limit}
              </span>
            </div>
            <Progress
              value={(subscription?.usage.conversations.used || 0) / (subscription?.usage.conversations.limit || 1) * 100}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Users</span>
              <span className="text-sm text-muted-foreground">
                {subscription?.usage.users.used} / {subscription?.usage.users.limit}
              </span>
            </div>
            <Progress
              value={(subscription?.usage.users.used || 0) / (subscription?.usage.users.limit || 1) * 100}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Storage</span>
              <span className="text-sm text-muted-foreground">
                {subscription?.usage.storage.used}GB / {subscription?.usage.storage.limit}GB
              </span>
            </div>
            <Progress
              value={(subscription?.usage.storage.used || 0) / (subscription?.usage.storage.limit || 1) * 100}
            />
          </div>
        </div>

        {(subscription?.usage.conversations.used || 0) >= (subscription?.usage.conversations.limit || 0) && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded p-4">
            <p className="text-sm text-red-800 mb-2">
              You've reached your conversation limit for this month.
            </p>
            <Button
              size="sm"
              onClick={() => router.push('/pricing')}
            >
              Upgrade Plan
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
```

### Feature Gate Component

```typescript
// src/components/shared/gates/FeatureGate.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/subscription/use-subscription';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  requiredPlan?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({
  feature,
  requiredPlan = ['pro', 'enterprise'],
  fallback,
  children,
}: FeatureGateProps) {
  const router = useRouter();
  const { subscription, hasFeature } = useSubscription();

  const hasAccess = hasFeature(feature) ||
                    (subscription?.plan && requiredPlan.includes(subscription.plan));

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center">
        <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          This feature requires a paid plan
        </h3>
        <p className="text-muted-foreground mb-4">
          Upgrade to access {feature}
        </p>
        <Button onClick={() => router.push('/pricing')}>
          View Plans
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

// Usage example:
// <FeatureGate feature="API Access" requiredPlan={['pro', 'enterprise']}>
//   <APIKeysManager />
// </FeatureGate>
```

---

## 7. Feature Gating System

### Feature Flag Utilities

```typescript
// src/lib/subscription/feature-gates.ts
import { getSubscriptionContext } from '@/lib/auth/server';

export const FEATURES = {
  API_ACCESS: 'api_access',
  CUSTOM_BRANDING: 'custom_branding',
  SSO: 'sso',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  PRIORITY_SUPPORT: 'priority_support',
  UNLIMITED_USERS: 'unlimited_users',
  UNLIMITED_CONVERSATIONS: 'unlimited_conversations',
} as const;

export const PLAN_FEATURES = {
  free: [
    // No premium features
  ],
  pro: [
    FEATURES.API_ACCESS,
    FEATURES.CUSTOM_BRANDING,
    FEATURES.ADVANCED_ANALYTICS,
    FEATURES.PRIORITY_SUPPORT,
  ],
  enterprise: [
    FEATURES.API_ACCESS,
    FEATURES.CUSTOM_BRANDING,
    FEATURES.SSO,
    FEATURES.ADVANCED_ANALYTICS,
    FEATURES.PRIORITY_SUPPORT,
    FEATURES.UNLIMITED_USERS,
    FEATURES.UNLIMITED_CONVERSATIONS,
  ],
};

export async function hasFeatureAccess(feature: string): Promise<boolean> {
  const context = await getSubscriptionContext();

  if (!context || !context.subscription) {
    return false;
  }

  const planFeatures =
    PLAN_FEATURES[context.subscription.plan_id as keyof typeof PLAN_FEATURES] || [];
  return planFeatures.includes(feature);
}

export async function requireFeature(feature: string): Promise<void> {
  const hasAccess = await hasFeatureAccess(feature);

  if (!hasAccess) {
    throw new Error(`Feature '${feature}' requires a paid plan`);
  }
}

// Usage in API routes:
// await requireFeature(FEATURES.API_ACCESS);
```

### Usage Limit Enforcement

```typescript
// src/lib/subscription/usage-limits.ts
import { getOrgUsage, incrementUsage } from './usage-tracking';
import { getOrgSubscription } from './subscription-helpers';

export async function checkUsageLimit(
  orgId: string,
  metricType: 'conversation' | 'user' | 'model' | 'storage'
): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getOrgSubscription(orgId);

  if (!subscription) {
    return { allowed: false, reason: 'No subscription found' };
  }

  const features = subscription.plan.features;
  const currentUsage = await getOrgUsage(orgId, 'current');

  // Check limits based on metric type
  switch (metricType) {
    case 'conversation':
      const convLimit = features.conversations_per_month;
      if (convLimit === -1) return { allowed: true }; // Unlimited

      const convUsed = currentUsage.conversations || 0;
      if (convUsed >= convLimit) {
        return {
          allowed: false,
          reason: `Monthly conversation limit reached (${convLimit})`,
        };
      }
      break;

    case 'user':
      const userLimit = features.users_max;
      if (userLimit === -1) return { allowed: true };

      const userCount = await getOrgUserCount(orgId);
      if (userCount >= userLimit) {
        return {
          allowed: false,
          reason: `User limit reached (${userLimit})`,
        };
      }
      break;

    case 'model':
      const modelLimit = features.models_max;
      if (modelLimit === -1) return { allowed: true };

      const modelCount = await getOrgModelCount(orgId);
      if (modelCount >= modelLimit) {
        return {
          allowed: false,
          reason: `Model limit reached (${modelLimit})`,
        };
      }
      break;

    case 'storage':
      const storageLimit = features.storage_gb;
      const storageUsed = currentUsage.storage_gb || 0;
      if (storageUsed >= storageLimit) {
        return {
          allowed: false,
          reason: `Storage limit reached (${storageLimit}GB)`,
        };
      }
      break;
  }

  return { allowed: true };
}

// Middleware to enforce limits
export async function enforceUsageLimit(
  orgId: string,
  metricType: 'conversation' | 'user' | 'model' | 'storage'
): Promise<void> {
  const { allowed, reason } = await checkUsageLimit(orgId, metricType);

  if (!allowed) {
    throw new Error(reason || 'Usage limit exceeded');
  }

  // Increment usage counter
  await incrementUsage(orgId, metricType);
}

// Usage in API routes:
// await enforceUsageLimit(org_id, 'conversation');
```

---

## 8. Usage Tracking & Limits

### Usage Tracking Helper Functions

```typescript
// src/lib/subscription/usage-tracking.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getOrgUsage(
  orgId: string,
  period: 'current' | 'last_month' = 'current'
): Promise<UsageData> {
  const supabase = await createSupabaseServerClient();

  // Calculate period dates
  const now = new Date();
  const periodStart =
    period === 'current'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodEnd =
    period === 'current'
      ? new Date(now.getFullYear(), now.getMonth() + 1, 0)
      : new Date(now.getFullYear(), now.getMonth(), 0);

  // Get usage from tracking table
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('org_id', orgId)
    .gte('period_start', periodStart.toISOString())
    .lte('period_end', periodEnd.toISOString());

  // Aggregate by metric type
  const aggregated = {
    conversations: 0,
    users: 0,
    models: 0,
    storage_gb: 0,
    api_calls: 0,
  };

  usage?.forEach(record => {
    if (record.metric_type in aggregated) {
      aggregated[record.metric_type as keyof typeof aggregated] += record.metric_value;
    }
  });

  return aggregated;
}

export async function incrementUsage(
  orgId: string,
  metricType: 'conversation' | 'user' | 'model' | 'storage' | 'api_call',
  value: number = 1
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const subscription = await getOrgSubscription(orgId);

  await supabase.from('usage_tracking').insert({
    org_id: orgId,
    subscription_id: subscription?.id,
    metric_type: metricType,
    metric_value: value,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  });
}

// Real-time usage tracking
export async function trackConversationCreated(orgId: string): Promise<void> {
  await incrementUsage(orgId, 'conversation');
}

export async function trackUserAdded(orgId: string): Promise<void> {
  await incrementUsage(orgId, 'user');
}

export async function trackModelCreated(orgId: string): Promise<void> {
  await incrementUsage(orgId, 'model');
}

export async function trackStorageUsed(orgId: string, sizeInBytes: number): Promise<void> {
  const sizeInGB = sizeInBytes / (1024 * 1024 * 1024);
  await incrementUsage(orgId, 'storage', sizeInGB);
}

export async function trackAPICall(orgId: string): Promise<void> {
  await incrementUsage(orgId, 'api_call');
}
```

### Integration with Existing Features

```typescript
// Update conversation creation to track usage
// src/actions/chat/conversations.ts
import { enforceUsageLimit, trackConversationCreated } from '@/lib/subscription/usage-limits';

export async function createConversation(title: string, orgId: string) {
  // Check if org can create more conversations
  await enforceUsageLimit(orgId, 'conversation');

  // Create conversation
  const conversation = await db.insert(conversations).values({
    title,
    org_id: orgId,
    // ... other fields
  });

  // Track usage
  await trackConversationCreated(orgId);

  return conversation;
}

// Update user invitation to track usage
// src/actions/organization/invites.ts
export async function createInvite(email: string, orgId: string) {
  // Check if org can add more users
  await enforceUsageLimit(orgId, 'user');

  // Create invite
  const invite = await db.insert(invites).values({
    email,
    org_id: orgId,
    // ... other fields
  });

  return invite;
}

// When invite is accepted:
export async function acceptInvite(inviteId: string, userId: string) {
  const invite = await getInvite(inviteId);

  // Add user to org
  await addUserToOrg(userId, invite.org_id);

  // Track user addition
  await trackUserAdded(invite.org_id);

  // Delete invite
  await deleteInvite(inviteId);
}
```

---

## 9. Billing & Invoicing

### Invoice Generation

Stripe handles invoice generation automatically, but you need to sync it to your database:

```typescript
// src/lib/subscription/webhook-handlers.ts
export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = await createSupabaseServerClient();

  const subscription = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (!subscription.data) {
    console.error('Subscription not found for invoice:', invoice.id);
    return;
  }

  // Store invoice in billing history
  await supabase.from('billing_history').insert({
    org_id: subscription.data.org_id,
    subscription_id: subscription.data.id,
    stripe_invoice_id: invoice.id,
    stripe_charge_id: invoice.charge as string,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'paid',
    invoice_date: new Date(invoice.created * 1000).toISOString(),
    paid_at: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
    invoice_pdf: invoice.invoice_pdf,
    hosted_invoice_url: invoice.hosted_invoice_url,
  });

  // Send receipt email (optional)
  await sendReceiptEmail(subscription.data.user_id, invoice);
}
```

### Billing History UI

```typescript
// src/components/features/billing/BillingHistory.tsx
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function BillingHistory() {
  const [invoices, setInvoices] = React.useState([]);

  React.useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const response = await fetch('/api/billing/history');
    const data = await response.json();
    setInvoices(data.invoices);
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Billing History</h3>

      <div className="space-y-4">
        {invoices.map((invoice: any) => (
          <div
            key={invoice.id}
            className="flex items-center justify-between border-b pb-4"
          >
            <div>
              <p className="font-medium">
                {new Date(invoice.invoice_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                ${(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(invoice.invoice_pdf, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

---

## 10. Customer Experience Flows

### Onboarding with Trial

```typescript
// src/app/(auth)/sign-up/page.tsx
'use client';

export default function SignUpPage() {
  const [step, setStep] = useState<'credentials' | 'plan'>('credentials');

  const handleSignUpComplete = async (user: User) => {
    // Show plan selection after sign-up
    setStep('plan');
  };

  if (step === 'plan') {
    return <PlanSelectionModal onComplete={() => router.push('/admin')} />;
  }

  return (
    <SignUpForm onComplete={handleSignUpComplete} />
  );
}
```

### Upgrade/Downgrade Flow

```typescript
// src/components/features/subscription/UpgradeModal.tsx
'use client';

export function UpgradeModal({ currentPlan }: { currentPlan: string }) {
  const handleUpgrade = async (newPriceId: string) => {
    const response = await fetch('/api/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ priceId: newPriceId }),
    });

    if (response.ok) {
      // Success - reload page to show new plan
      window.location.reload();
    }
  };

  return (
    <Dialog>
      <DialogContent>
        <h2>Upgrade Your Plan</h2>
        <p>You'll be charged the prorated difference immediately.</p>

        {/* Show available upgrade options */}
        <div className="space-y-4">
          {availablePlans
            .filter(plan => plan.price > currentPlanPrice)
            .map(plan => (
              <Card key={plan.id}>
                <h3>{plan.name}</h3>
                <p>{plan.price}/month</p>
                <Button onClick={() => handleUpgrade(plan.stripePriceId)}>
                  Upgrade to {plan.name}
                </Button>
              </Card>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Cancellation Flow with Feedback

```typescript
// src/components/features/subscription/CancellationFlow.tsx
'use client';

export function CancellationFlow() {
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleCancel = async () => {
    // Save cancellation feedback
    await fetch('/api/subscriptions/feedback', {
      method: 'POST',
      body: JSON.stringify({ reason, feedback }),
    });

    // Cancel subscription
    await fetch('/api/subscriptions/cancel', {
      method: 'POST',
    });

    // Show confirmation
    alert('Your subscription will be canceled at the end of the billing period.');
  };

  return (
    <Dialog>
      <DialogContent>
        <h2>We're sorry to see you go</h2>

        <div className="space-y-4">
          <div>
            <Label>Why are you canceling?</Label>
            <Select value={reason} onValueChange={setReason}>
              <option value="too_expensive">Too expensive</option>
              <option value="missing_features">Missing features</option>
              <option value="not_using">Not using it enough</option>
              <option value="switching">Switching to competitor</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div>
            <Label>Additional feedback (optional)</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Help us improve..."
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Never Mind
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 11. Administrative Features

### Super Admin Dashboard

```typescript
// src/app/admin/super/subscriptions/page.tsx
import { auth } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/permissions';
import { getAllSubscriptions } from '@/actions/admin/subscriptions';

export default async function SuperAdminSubscriptionsPage() {
  const { userId } = await auth();

  if (!userId || !await isSuperAdmin(userId)) {
    redirect('/');
  }

  const subscriptions = await getAllSubscriptions();

  return (
    <div>
      <h1>All Subscriptions</h1>

      <table>
        <thead>
          <tr>
            <th>Organization</th>
            <th>Plan</th>
            <th>Status</th>
            <th>MRR</th>
            <th>Renewal Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map(sub => (
            <tr key={sub.id}>
              <td>{sub.org.name}</td>
              <td>{sub.plan_id}</td>
              <td>{sub.status}</td>
              <td>${sub.amount_monthly / 100}</td>
              <td>{new Date(sub.current_period_end).toLocaleDateString()}</td>
              <td>
                <Button size="sm">View Details</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8">
        <h2>Metrics</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <h3>Total MRR</h3>
            <p className="text-3xl font-bold">
              ${subscriptions.reduce((sum, s) => sum + s.amount_monthly, 0) / 100}
            </p>
          </Card>
          <Card>
            <h3>Active Subscriptions</h3>
            <p className="text-3xl font-bold">
              {subscriptions.filter(s => s.status === 'active').length}
            </p>
          </Card>
          <Card>
            <h3>Churned This Month</h3>
            <p className="text-3xl font-bold">
              {subscriptions.filter(s => s.status === 'canceled').length}
            </p>
          </Card>
          <Card>
            <h3>Trial Conversions</h3>
            <p className="text-3xl font-bold">
              {subscriptions.filter(s => s.status === 'active' && s.trial_end).length}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

### Revenue Analytics

```typescript
// src/lib/analytics/revenue.ts
export async function getRevenueMetrics(period: 'month' | 'quarter' | 'year') {
  const supabase = await createSupabaseServerClient();

  // Get all paid invoices for period
  const { data: invoices } = await supabase
    .from('billing_history')
    .select('*')
    .eq('status', 'paid')
    .gte('paid_at', getPeriodStart(period))
    .lte('paid_at', new Date().toISOString());

  const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0;

  // Get MRR (Monthly Recurring Revenue)
  const { data: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select('amount_monthly')
    .eq('status', 'active');

  const mrr = activeSubscriptions?.reduce((sum, sub) => sum + sub.amount_monthly, 0) || 0;

  // Calculate ARR (Annual Recurring Revenue)
  const arr = mrr * 12;

  // Customer metrics
  const { count: totalCustomers } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: newCustomers } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('created_at', getPeriodStart(period));

  return {
    totalRevenue: totalRevenue / 100, // Convert from cents
    mrr: mrr / 100,
    arr: arr / 100,
    totalCustomers: totalCustomers || 0,
    newCustomers: newCustomers || 0,
    averageRevenuePerCustomer: totalCustomers ? mrr / totalCustomers / 100 : 0,
  };
}
```

---

## 12. Compliance & Legal

### Required Legal Pages

```typescript
// src/app/legal/terms/page.tsx
export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

      <div className="prose prose-lg">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using AgentFlow ("Service"), you accept and agree to be bound
          by the terms and provision of this agreement.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          AgentFlow provides a platform for managing AI-powered conversations...
        </p>

        <h2>3. Subscription and Billing</h2>
        <h3>3.1 Subscription Plans</h3>
        <p>
          We offer multiple subscription tiers (Free, Pro, Enterprise) with different
          features and usage limits...
        </p>

        <h3>3.2 Billing</h3>
        <p>
          Subscriptions are billed monthly or annually in advance. You authorize us to
          charge your payment method on a recurring basis...
        </p>

        <h3>3.3 Cancellation</h3>
        <p>
          You may cancel your subscription at any time. Cancellation will take effect
          at the end of your current billing period...
        </p>

        <h3>3.4 Refund Policy</h3>
        <p>
          We offer a 14-day money-back guarantee for new subscriptions. Refunds are
          prorated based on unused time...
        </p>

        <h2>4. Usage Limits</h2>
        <p>
          Each subscription tier includes specific usage limits. Exceeding these limits
          may result in service interruption or additional charges...
        </p>

        <h2>5. Data Privacy</h2>
        <p>
          Your use of the Service is also governed by our Privacy Policy...
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are owned
          by AgentFlow and are protected by copyright...
        </p>

        <h2>7. Termination</h2>
        <p>
          We may terminate or suspend your account and access to the Service immediately,
          without prior notice, for conduct that we believe violates these Terms...
        </p>

        {/* Add more sections as needed */}
      </div>
    </div>
  );
}
```

```typescript
// src/app/legal/privacy/page.tsx
export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-lg">
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <h2>1. Information We Collect</h2>
        <h3>1.1 Account Information</h3>
        <ul>
          <li>Name and email address</li>
          <li>Organization information</li>
          <li>Payment information (processed by Stripe)</li>
        </ul>

        <h3>1.2 Usage Information</h3>
        <ul>
          <li>Conversations and messages</li>
          <li>AI model configurations</li>
          <li>Usage metrics and analytics</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To process your transactions</li>
          <li>To send you service-related communications</li>
          <li>To improve our Service</li>
        </ul>

        <h2>3. Data Storage and Security</h2>
        <p>
          We use industry-standard security measures to protect your data. All data
          is encrypted in transit and at rest...
        </p>

        <h2>4. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to
          provide you services...
        </p>

        <h2>5. Your Rights (GDPR)</h2>
        <p>
          If you are located in the European Economic Area, you have certain rights:
        </p>
        <ul>
          <li>Right to access your data</li>
          <li>Right to rectification</li>
          <li>Right to erasure</li>
          <li>Right to data portability</li>
          <li>Right to object to processing</li>
        </ul>

        <h2>6. Cookie Policy</h2>
        <p>
          We use cookies and similar tracking technologies to track activity on our
          Service...
        </p>

        <h2>7. Third-Party Services</h2>
        <p>
          We use the following third-party services:
        </p>
        <ul>
          <li>Stripe for payment processing</li>
          <li>Supabase for data storage</li>
          <li>Better-Auth for authentication</li>
        </ul>

        <h2>8. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, contact us at:
          privacy@agentflow.live
        </p>
      </div>
    </div>
  );
}
```

### GDPR Compliance Features

```typescript
// src/app/api/gdpr/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Export all user data
  const userData = await exportUserData(userId);

  // Create downloadable JSON file
  return NextResponse.json(userData, {
    headers: {
      'Content-Disposition': `attachment; filename="user-data-${userId}.json"`,
      'Content-Type': 'application/json',
    },
  });
}

async function exportUserData(userId: string) {
  // Gather all user data from all tables
  const user = await getUserById(userId);
  const conversations = await getUserConversations(userId);
  const messages = await getUserMessages(userId);
  const organizations = await getUserOrganizations(userId);
  const subscriptions = await getUserSubscriptions(userId);

  return {
    user,
    conversations,
    messages,
    organizations,
    subscriptions,
    exportDate: new Date().toISOString(),
  };
}
```

```typescript
// src/app/api/gdpr/delete/route.ts
export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { confirmation } = await req.json();

  if (confirmation !== 'DELETE MY ACCOUNT') {
    return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 });
  }

  // Delete all user data
  await deleteUserData(userId);

  return NextResponse.json({ success: true });
}

async function deleteUserData(userId: string) {
  // Delete in correct order to respect foreign keys
  await deleteUserMessages(userId);
  await deleteUserConversations(userId);
  await deleteUserOrganizations(userId);
  await deleteUserSubscription(userId);
  await deleteUserAccount(userId);
}
```

---

## 13. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Database schema migrations
- [ ] Stripe account setup and product/price creation
- [ ] Better-Auth integration with subscription fields
- [ ] Basic subscription CRUD operations
- [ ] Webhook handler setup

### Phase 2: Core Features (Week 3-4)

- [ ] Pricing page UI
- [ ] Checkout flow
- [ ] Subscription management dashboard
- [ ] Feature gating system
- [ ] Usage tracking implementation

### Phase 3: User Experience (Week 5-6)

- [ ] Upgrade/downgrade flows
- [ ] Billing history UI
- [ ] Customer portal integration
- [ ] Usage limit enforcement
- [ ] Email notifications (trial ending, payment failed, etc.)

### Phase 4: Administrative (Week 7)

- [ ] Super admin dashboard
- [ ] Revenue analytics
- [ ] Subscription management tools
- [ ] Coupon/discount system

### Phase 5: Compliance & Polish (Week 8)

- [ ] Legal pages (Terms, Privacy)
- [ ] GDPR compliance features
- [ ] Data export/deletion
- [ ] Documentation
- [ ] Testing and bug fixes

### Phase 6: Launch (Week 9)

- [ ] Production Stripe setup
- [ ] Final testing
- [ ] Marketing site updates
- [ ] Launch announcement

---

## 14. Cost Estimates

### Development Costs (Time)

```
Assuming 1 full-time developer:

Phase 1: Foundation          - 80 hours  (2 weeks)
Phase 2: Core Features       - 80 hours  (2 weeks)
Phase 3: User Experience     - 80 hours  (2 weeks)
Phase 4: Administrative      - 40 hours  (1 week)
Phase 5: Compliance & Polish - 40 hours  (1 week)
Phase 6: Launch             - 40 hours  (1 week)

Total: 360 hours (~9 weeks full-time)

Estimated Cost (at $100/hour): $36,000
```

### Monthly Operational Costs

```yaml
Infrastructure:
  - Supabase Pro: $25/month
  - Vercel Pro: $20/month
  - Stripe: 2.9% + $0.30 per transaction
  - Email service (SendGrid/Mailgun): $15/month
  - Monitoring (Sentry): $26/month

Support:
  - Customer support tool (Intercom/Zendesk): $79/month

Total Fixed Costs: ~$165/month + transaction fees

At 100 customers ($2,900 MRR):
  - Stripe fees: ~$90
  - Total costs: ~$255
  - Net revenue: $2,645
  - Profit margin: 91%
```

### Break-Even Analysis

```
Development Investment: $36,000

Monthly Net Revenue Per Customer:
  - Pro: $29 - $2.65 fees = $26.35
  - Enterprise: $299 - $9.65 fees = $289.35

Break-Even Scenarios:
  - 100% Pro customers: 1,366 customers
  - 50/50 Pro/Enterprise: 228 customers
  - 100% Enterprise: 124 customers

Realistic 6-month projection (mixed):
  - Month 1: 10 customers ($290 MRR)
  - Month 2: 25 customers ($725 MRR)
  - Month 3: 50 customers ($1,450 MRR)
  - Month 4: 100 customers ($2,900 MRR)
  - Month 5: 200 customers ($5,800 MRR)
  - Month 6: 350 customers ($10,150 MRR)

Break-even at Month 4-5
```

---

## 15. Conclusion & Recommendations

### Recommended Approach

1. **Start with Simple Tiers**
   - Free, Pro, Enterprise
   - Clear value proposition at each level
   - 14-day free trial on paid plans

2. **Focus on Core Use Cases First**
   - Self-serve checkout for Pro
   - Manual sales for Enterprise
   - Usage limits on Free tier drive upgrades

3. **Iterate Based on Data**
   - Track conversion rates
   - Monitor feature usage
   - Adjust pricing based on customer feedback

### Key Success Factors

1. **Clear Value Communication**
   - Show ROI for paid plans
   - Highlight premium features
   - Transparent pricing

2. **Smooth Upgrade Path**
   - Easy self-serve upgrade
   - No credit card for trial
   - Prorated billing

3. **Customer Retention**
   - Excellent support
   - Regular feature updates
   - Listen to feedback

### Risk Mitigation

1. **Technical Risks**
   - Thorough testing of payment flows
   - Webhook reliability monitoring
   - Backup payment processing

2. **Business Risks**
   - Competitive pricing research
   - Clear differentiation from competitors
   - Strong customer support

3. **Legal Risks**
   - Proper Terms of Service
   - GDPR compliance from day 1
   - Regular legal reviews

---

## Next Steps

1. **Review this document** with your team
2. **Validate pricing** with potential customers
3. **Set up Stripe account** and create products
4. **Begin Phase 1** of implementation
5. **Establish metrics** to track success

**Questions to Consider:**

- What is your target market segment?
- What is your customer acquisition strategy?
- How will you handle support at scale?
- What makes your offering unique?
- What is your long-term vision (exit, bootstrap, etc.)?

---

_Document created: January 22, 2026_
_Version: 1.0_
_Status: Requirements Specification_
