"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Star, Rocket, Crown } from "lucide-react";
import { useState } from "react";

const PACKAGES = [
  { id: "STARTER", name: "Starter", price: 5, broadcasts: 1, icon: Zap, features: ["1 broadcast", "Basic analytics", "Standard queue"] },
  { id: "STANDARD", name: "Standard", price: 15, broadcasts: 5, icon: Star, features: ["5 broadcasts", "Full analytics", "Priority queue"], popular: true },
  { id: "PRO", name: "Pro", price: 50, broadcasts: 25, icon: Rocket, features: ["25 broadcasts", "Advanced analytics", "High priority", "Featured placement"] },
  { id: "BUSINESS", name: "Business", price: 200, broadcasts: -1, icon: Crown, features: ["Unlimited weekly", "Premium analytics", "Top priority", "Custom branding"] },
];

interface BroadcastOrderFormProps {
  channelId: string;
  videoId: string;
}

export function BroadcastOrderForm({ channelId, videoId }: BroadcastOrderFormProps) {
  const [selected, setSelected] = useState("STANDARD");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Choose a Package</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {PACKAGES.map((pkg) => (
          <Card
            key={pkg.id}
            className={`cursor-pointer border-border/50 bg-card/50 transition-all hover:border-reel/50 ${
              selected === pkg.id ? "border-reel ring-1 ring-reel" : ""
            }`}
            onClick={() => setSelected(pkg.id)}
          >
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <pkg.icon className="h-4 w-4 text-reel" />
                  <span className="font-medium">{pkg.name}</span>
                </div>
                {pkg.popular && <Badge className="bg-reel text-white text-xs">Popular</Badge>}
              </div>
              <p className="mb-2 text-2xl font-bold">€{pkg.price}</p>
              <p className="text-sm text-muted-foreground">
                {pkg.broadcasts === -1 ? "Unlimited" : pkg.broadcasts} broadcast{pkg.broadcasts !== 1 && "s"}
              </p>
              <ul className="mt-3 space-y-1">
                {pkg.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground">• {f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button className="w-full bg-reel hover:bg-reel/90" size="lg">
        Purchase {PACKAGES.find((p) => p.id === selected)?.name} Package
      </Button>
    </div>
  );
}
