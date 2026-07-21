import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const adapter = new PrismaPg("postgresql://localhost:5432/reel_tv");
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Fitness TV", slug: "fitness", icon: "💪", description: "Workouts, nutrition, and health tips" },
  { name: "Startup TV", slug: "startup", icon: "🚀", description: "Entrepreneurship, funding, and growth" },
  { name: "AI TV", slug: "ai", icon: "🤖", description: "Artificial intelligence, ML, and tech" },
  { name: "Travel TV", slug: "travel", icon: "✈️", description: "Destinations, guides, and adventures" },
  { name: "Cars TV", slug: "cars", icon: "🚗", description: "Reviews, racing, and car culture" },
  { name: "Food TV", slug: "food", icon: "🍕", description: "Recipes, reviews, and food culture" },
  { name: "Fashion TV", slug: "fashion", icon: "👗", description: "Style, trends, and fashion news" },
  { name: "Music TV", slug: "music", icon: "🎵", description: "Music, performances, and artists" },
  { name: "Gaming TV", slug: "gaming", icon: "🎮", description: "Gaming, esports, and reviews" },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Create categories
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("✅ Categories seeded");

  // Create demo admin user
  await prisma.user.upsert({
    where: { clerkId: "admin_demo" },
    update: {},
    create: {
      clerkId: "admin_demo",
      email: "admin@reeltv.app",
      name: "REELTV Admin",
      role: Role.ADMIN,
      bio: "Platform administrator",
    },
  });
  console.log("✅ Admin user seeded");

  // Create demo creator
  const creator = await prisma.user.upsert({
    where: { clerkId: "creator_demo" },
    update: {},
    create: {
      clerkId: "creator_demo",
      email: "creator@reeltv.app",
      name: "Demo Creator",
      role: Role.CREATOR,
      bio: "Content creator on REELTV",
    },
  });

  // Create demo channels
  const fitnessCategory = await prisma.category.findUnique({ where: { slug: "fitness" } });
  const aiCategory = await prisma.category.findUnique({ where: { slug: "ai" } });
  const gamingCategory = await prisma.category.findUnique({ where: { slug: "gaming" } });

  const channels = [
    {
      name: "Fitness TV",
      slug: "fitness-tv",
      description: "Your daily dose of fitness motivation and tips",
      categoryId: fitnessCategory?.id,
      ownerId: creator.id,
      isFeatured: true,
    },
    {
      name: "AI TV",
      slug: "ai-tv",
      description: "Exploring the world of artificial intelligence",
      categoryId: aiCategory?.id,
      ownerId: creator.id,
      isFeatured: true,
    },
    {
      name: "Gaming TV",
      slug: "gaming-tv",
      description: "The best gaming content, live and on-demand",
      categoryId: gamingCategory?.id,
      ownerId: creator.id,
      isFeatured: true,
    },
  ];

  for (const ch of channels) {
    await prisma.channel.upsert({
      where: { slug: ch.slug },
      update: {},
      create: ch,
    });
  }
  console.log("✅ Channels seeded");

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
