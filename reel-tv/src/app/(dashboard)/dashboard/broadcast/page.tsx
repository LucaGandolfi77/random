"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Check, Zap, Crown, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const packages = [
  {
    id: "STARTER",
    name: "Starter",
    price: 500,
    broadcasts: 1,
    icon: Radio,
    features: ["1 broadcast", "Basic analytics", "Standard support"],
    popular: false,
  },
  {
    id: "STANDARD",
    name: "Standard",
    price: 1500,
    broadcasts: 5,
    icon: Zap,
    features: ["5 broadcasts", "Full analytics", "Priority support"],
    popular: true,
  },
  {
    id: "PRO",
    name: "Pro",
    price: 5000,
    broadcasts: 25,
    icon: Crown,
    features: ["25 broadcasts", "Advanced analytics", "Featured placement"],
    popular: false,
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: 20000,
    broadcasts: -1,
    icon: Building2,
    features: ["Unlimited weekly", "Premium analytics", "Custom branding"],
    popular: false,
  },
];

export default function BroadcastPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buy Airtime</h1>
        <p className="text-muted-foreground">Choose a package to broadcast your Reel on a channel</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => {
          const Icon = pkg.icon;
          return (
            <Card
              key={pkg.id}
              className={`relative border-border/50 bg-card/50 ${
                pkg.popular ? "border-reel shadow-lg shadow-reel/10" : ""
              }`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-reel">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <Icon className="mx-auto mb-2 h-8 w-8 text-reel" />
                <CardTitle>{pkg.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{formatCurrency(pkg.price)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pkg.broadcasts === -1 ? "Unlimited" : `${pkg.broadcasts} broadcast${pkg.broadcasts > 1 ? "s" : ""}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-reel" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${pkg.popular ? "bg-reel hover:bg-reel/90" : ""}`}
                  variant={pkg.popular ? "default" : "outline"}
                >
                  Buy Now
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Recent Broadcast Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No broadcast orders yet. Purchase airtime to get started!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
