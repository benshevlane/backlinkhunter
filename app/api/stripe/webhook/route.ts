import { NextResponse } from 'next/server';
import { updateOrganisationPlan } from '@/src/lib/store';
import { PLAN_LIMITS, stripePriceToPlan } from '@/src/lib/quota';
import type { PlanTier } from '@/src/lib/types';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

async function verifyAndParseEvent(request: Request): Promise<StripeEvent | null> {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!STRIPE_WEBHOOK_SECRET || !signature) {
    // In dev mode without Stripe configured, try to parse raw JSON
    if (!STRIPE_WEBHOOK_SECRET) {
      console.warn('[Stripe] STRIPE_WEBHOOK_SECRET not set — parsing raw body for dev mode.');
      try {
        return JSON.parse(body) as StripeEvent;
      } catch {
        return null;
      }
    }
    return null;
  }

  // In production, use Stripe SDK for signature verification.
  // For now, we parse the body and trust the signature header is present.
  // TODO: Replace with `stripe.webhooks.constructEvent(body, signature, secret)` when stripe SDK is added.
  try {
    return JSON.parse(body) as StripeEvent;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const event = await verifyAndParseEvent(request);

  if (!event) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const obj = event.data.object;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const customerId = obj.customer as string;
      const status = obj.status as string;
      const priceId = ((obj.items as Record<string, unknown>)?.data as Array<Record<string, unknown>>)?.[0]
        ?.price as Record<string, unknown>;
      const priceIdStr = (priceId?.id as string) ?? '';

      const plan = stripePriceToPlan(priceIdStr);
      if (!plan || !customerId) break;

      // Only update if subscription is active
      if (status === 'active' || status === 'trialing') {
        await updateOrganisationPlanByStripeCustomer(customerId, plan, obj.id as string);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const customerId = obj.customer as string;
      if (customerId) {
        await updateOrganisationPlanByStripeCustomer(customerId, 'starter', null);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const customerId = obj.customer as string;
      // Log the failure — could trigger email notification in future
      console.warn(`[Stripe] Payment failed for customer ${customerId}`);
      break;
    }

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}

async function updateOrganisationPlanByStripeCustomer(
  stripeCustomerId: string,
  plan: PlanTier,
  subscriptionId: string | null,
) {
  // Look up the org by stripe_customer_id via the store
  const { createServerSupabase } = await import('@/src/lib/supabase/server');
  const supabase = createServerSupabase();
  const { data: org } = await supabase
    .from('organisations')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();

  if (!org) {
    console.warn(`[Stripe] No org found for customer ${stripeCustomerId}`);
    return;
  }

  const limits = PLAN_LIMITS[plan];

  await updateOrganisationPlan(org.id, {
    plan,
    stripe_subscription_id: subscriptionId,
    monthly_prospect_limit: limits.monthly_prospect_limit,
  });
}
