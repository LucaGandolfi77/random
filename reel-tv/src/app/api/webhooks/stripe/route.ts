import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await prisma.broadcastOrder.update({
            where: { id: orderId },
            data: { status: "PAID" },
          });

          // Create payment record
          if (session.payment_intent) {
            await prisma.payment.create({
              data: {
                stripePaymentId: session.payment_intent as string,
                userId: session.metadata?.userId ?? "",
                broadcastOrderId: orderId,
                amount: session.amount_total ?? 0,
                currency: session.currency ?? "eur",
                status: "SUCCEEDED",
              },
            });
          }

          // Create transaction
          await prisma.transaction.create({
            data: {
              userId: session.metadata?.userId ?? "",
              type: "PURCHASE",
              amount: session.amount_total ?? 0,
              currency: session.currency ?? "eur",
              description: `Broadcast order purchase`,
              stripeSessionId: session.id,
            },
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error("Payment failed:", paymentIntent.id);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        const payment = await prisma.payment.findFirst({
          where: { stripePaymentId: paymentIntentId },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED" },
          });

          await prisma.broadcastOrder.update({
            where: { id: payment.broadcastOrderId },
            data: { status: "REFUNDED" },
          });

          await prisma.transaction.create({
            data: {
              userId: payment.userId,
              type: "REFUND",
              amount: charge.amount_refunded,
              currency: charge.currency,
              description: `Refund for payment ${paymentIntentId}`,
            },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
