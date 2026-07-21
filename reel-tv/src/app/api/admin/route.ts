import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    const totalChannels = await prisma.channel.count();
    const totalVideos = await prisma.video.count();
    const pendingReports = await prisma.report.count({ where: { status: "PENDING" } });
    const totalRevenue = await prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCEEDED" } });

    return NextResponse.json({
      totalUsers,
      totalChannels,
      totalVideos,
      pendingReports,
      totalRevenue: totalRevenue._sum.amount || 0,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch admin stats" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, data } = body;

    if (action === "updateUser" && id) {
      const user = await prisma.user.update({ where: { id }, data });
      return NextResponse.json({ user });
    }

    if (action === "updateChannel" && id) {
      const channel = await prisma.channel.update({ where: { id }, data });
      return NextResponse.json({ channel });
    }

    if (action === "updateReport" && id) {
      const report = await prisma.report.update({ where: { id }, data });
      return NextResponse.json({ report });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Admin action failed" }, { status: 500 });
  }
}
