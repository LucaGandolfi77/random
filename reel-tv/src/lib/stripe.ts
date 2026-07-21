import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-06-24.dahlia",
  typescript: true,
});

export const STRIPE_PLANS = {
  STARTER: {
    name: "Starter",
    price: 500,
    broadcasts: 1,
    features: ["1 broadcast", "Basic analytics", "Standard support"],
  },
  STANDARD: {
    name: "Standard",
    price: 1500,
    broadcasts: 5,
    features: ["5 broadcasts", "Full analytics", "Priority support"],
  },
  PRO: {
    name: "Pro",
    price: 5000,
    broadcasts: 25,
    features: ["25 broadcasts", "Advanced analytics", "Priority support", "Featured placement"],
  },
  BUSINESS: {
    name: "Business",
    price: 20000,
    broadcasts: -1, // unlimited weekly
    features: ["Unlimited weekly", "Premium analytics", "Dedicated support", "Custom branding"],
  },
} as const;

export type BroadcastPackage = keyof typeof STRIPE_PLANS;
