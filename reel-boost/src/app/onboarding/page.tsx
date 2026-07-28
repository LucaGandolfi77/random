import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingPicker } from "./OnboardingPicker";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, icon: true },
  });

  return (
    <div className="min-h-[100dvh]">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-bold">Pick your interests</h1>
        <p className="mt-1 text-white/60">
          Choose the categories you love. Your feed is tuned by the videos you{" "}
          like, but starting right helps.
        </p>
        <OnboardingPicker categories={categories} />
      </main>
    </div>
  );
}