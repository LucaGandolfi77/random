"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

const FAQS = [
  { q: "What is REELTV?", a: "REELTV is a platform where creators can broadcast their Reels on topic-dedicated TV channels. You buy airtime and your content gets played to the channel's audience." },
  { q: "How do I broadcast my Reel?", a: "Upload your video, choose a channel and broadcast package, complete the payment, and your Reel will be scheduled for broadcast based on your package priority." },
  { q: "What packages are available?", a: "We offer Starter (1 broadcast), Standard (5 broadcasts), Pro (25 broadcasts), and Business (unlimited weekly) packages. Prices start from €5." },
  { q: "How does the scheduling work?", a: "Higher-tier packages get higher priority in the rotation. The scheduler ensures fair exposure while favoring higher-paying creators. No immediate repetition is guaranteed." },
  { q: "Can I track my broadcast performance?", a: "Yes! The dashboard provides real-time analytics including views, watch time, engagement, and revenue metrics for all your broadcasts." },
  { q: "Is there a refund policy?", a: "Unused broadcasts can be refunded within 7 days of purchase. Active broadcasts that have started cannot be refunded." },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-8 text-center">
          <HelpCircle className="mx-auto mb-4 h-12 w-12 text-reel" />
          <h1 className="mb-2 text-3xl font-bold">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">Everything you need to know about REELTV</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <Card key={i} className="border-border/50 bg-card/50">
              <CardContent className="p-0">
                <button
                  className="flex w-full items-center justify-between p-4 text-left"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                >
                  <span className="font-medium">{faq.q}</span>
                  <span className="text-xl text-muted-foreground">{openIndex === i ? "−" : "+"}</span>
                </button>
                {openIndex === i && (
                  <div className="border-t border-border/50 px-4 pb-4 pt-2 text-sm text-muted-foreground">
                    {faq.a}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
