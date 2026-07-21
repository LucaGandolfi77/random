import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { STRIPE_PLANS } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";

const plans = [
  {
    key: "STARTER" as const,
    popular: false,
  },
  {
    key: "STANDARD" as const,
    popular: true,
  },
  {
    key: "PRO" as const,
    popular: false,
  },
  {
    key: "BUSINESS" as const,
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Buy Broadcasting Time</h1>
          <p className="text-lg text-muted-foreground">
            Choose a package and get your Reel on air
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map(({ key, popular }) => {
            const plan = STRIPE_PLANS[key];
            return (
              <Card
                key={key}
                className={`relative border-border/50 bg-card/50 ${
                  popular ? "border-reel shadow-lg shadow-reel/10" : ""
                }`}
              >
                {popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-reel">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{formatCurrency(plan.price)}</span>
                    <span className="text-muted-foreground">
                      /{key === "BUSINESS" ? "week" : "package"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {key === "BUSINESS" ? "Unlimited broadcasts" : `${plan.broadcasts} broadcast${plan.broadcasts > 1 ? "s" : ""}`}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-reel" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${popular ? "bg-reel hover:bg-reel/90" : ""}`}
                    variant={popular ? "default" : "outline"}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "How does broadcasting work?",
                a: "When you buy airtime, your Reel enters the channel's broadcast schedule. It will be played repeatedly according to your package tier.",
              },
              {
                q: "Can I choose which channel to broadcast on?",
                a: "Yes! You select the channel when creating your broadcast order. Your Reel will be scheduled on that specific channel.",
              },
              {
                q: "What happens after my package runs out?",
                a: "You can purchase a new package at any time. Your Reel will stop broadcasting until you buy more airtime.",
              },
              {
                q: "Can I get a refund?",
                a: "We offer refunds within 24 hours of purchase if no broadcasts have been made yet.",
              },
            ].map((faq) => (
              <div key={faq.q} className="rounded-lg border border-border/50 bg-card/50 p-4">
                <h3 className="mb-2 font-semibold">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
