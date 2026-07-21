import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WebhookEvent } from "@/types/api";

export async function POST(request: Request) {
  const body = await request.json();
  const evt = body as WebhookEvent;

  switch (evt.type) {
    case "user.created": {
      const { id, email_addresses, image_url, first_name, last_name } = evt.data.object as Record<string, unknown>;
      const email = (email_addresses as Array<{ email_address: string }>)?.[0]?.email_address;

      if (id && email) {
        await prisma.user.create({
          data: {
            clerkId: id as string,
            email,
            name: [first_name, last_name].filter(Boolean).join(" ") || null,
            avatar: image_url as string || null,
          },
        });
      }
      break;
    }

    case "user.updated": {
      const { id, email_addresses, image_url, first_name, last_name } = evt.data.object as Record<string, unknown>;
      const email = (email_addresses as Array<{ email_address: string }>)?.[0]?.email_address;

      if (id) {
        await prisma.user.update({
          where: { clerkId: id as string },
          data: {
            email: email || undefined,
            name: [first_name, last_name].filter(Boolean).join(" ") || undefined,
            avatar: image_url as string || undefined,
          },
        });
      }
      break;
    }

    case "user.deleted": {
      const { id } = evt.data.object as Record<string, unknown>;
      if (id) {
        await prisma.user.delete({
          where: { clerkId: id as string },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
