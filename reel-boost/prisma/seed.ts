import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const dbPath = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbPath }),
});

const SAMPLES = [
  {
    file: "BigBuckBunny",
    title: "Big Buck Bunny — the classic",
  },
  { file: "ElephantsDream", title: "Elephant's Dream" },
  { file: "ForBiggerBlazes", title: "For Bigger Blazes" },
  { file: "ForBiggerEscapes", title: "For Bigger Escapes" },
  { file: "ForBiggerFun", title: "For Bigger Fun" },
  { file: "ForBiggerJoyrides", title: "For Bigger Joyrides" },
  { file: "ForBiggerMeltdowns", title: "For Bigger Meltdowns" },
  { file: "Sintel", title: "Sintel — short film" },
  { file: "TearsOfSteel", title: "Tears of Steel" },
  { file: "SubaruOutbackOnStreetAndDirt", title: "Subaru on street & dirt" },
];

function videoUrl(file: string) {
  return `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${file}.mp4`;
}
function thumbUrl(file: string) {
  return `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/${file}.jpg`;
}

const CATEGORIES = [
  { name: "Comedy", slug: "comedy", icon: "😂" },
  { name: "Gaming", slug: "gaming", icon: "🎮" },
  { name: "Music", slug: "music", icon: "🎵" },
  { name: "Sport", slug: "sport", icon: "⚽" },
  { name: "Food", slug: "food", icon: "🍳" },
  { name: "Tech", slug: "tech", icon: "💻" },
  { name: "Travel", slug: "travel", icon: "✈️" },
  { name: "Animals", slug: "animals", icon: "🐶" },
];

async function main() {
  console.log("Seeding ReelBoost…");

  const catRecords = await Promise.all(
    CATEGORIES.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        create: c,
        update: c,
      }),
    ),
  );
  const catBySlug = Object.fromEntries(catRecords.map((c) => [c.slug, c]));
  const catIds = catRecords.map((c) => c.id);
  console.log(`  categories: ${catRecords.length}`);

  const pwHash = await bcrypt.hash("demo123", 10);

  const creator = await prisma.user.upsert({
    where: { email: "creator@demo.app" },
    create: { email: "creator@demo.app", passwordHash: pwHash, name: "voltatila", walletBalance: 1200 },
    update: {},
  });
  const creator2 = await prisma.user.upsert({
    where: { email: "vito@demo.app" },
    create: { email: "vito@demo.app", passwordHash: pwHash, name: "vitodayout", walletBalance: 300 },
    update: {},
  });
  const viewer = await prisma.user.upsert({
    where: { email: "viewer@demo.app" },
    create: { email: "viewer@demo.app", passwordHash: pwHash, name: "guest_watcher", walletBalance: 100 },
    update: {},
  });

  // Give the viewer some category preferences (Gaming + Comedy) so personalization is visible.
  await prisma.userCategory.deleteMany({ where: { userId: viewer.id } });
  await prisma.userCategory.createMany({
    data: ["gaming", "comedy"].map((s) => ({ userId: viewer.id, categoryId: catBySlug[s].id })),
  });

  console.log(`  users: creator, creator2, viewer`);

  // ─── Videos ────────────────────────────────────────────────
  const videoSeeds: { author: typeof creator; cat: string; idx: number; title: string }[] = [];
  SAMPLES.forEach((s, i) => {
    const author = i % 2 === 0 ? creator : creator2;
    videoSeeds.push({ author, cat: CATEGORIES[i % CATEGORIES.length].slug, idx: i, title: s.title });
  });

  const videoRecords = [];
  for (const v of videoSeeds) {
    const sample = SAMPLES[v.idx];
    const created = await prisma.video.create({
      data: {
        title: v.title,
        description: `Demo reel #${v.idx + 1} from ${v.author.name}`,
        url: videoUrl(sample.file),
        thumbnailUrl: thumbUrl(sample.file),
        duration: 60,
        sourceType: "DEMO",
        authorId: v.author.id,
        categoryId: catBySlug[v.cat].id,
        active: true,
      },
    });
    videoRecords.push(created);
  }
  console.log(`  videos: ${videoRecords.length}`);

  // ─── Boosts (pay to be famous) ─────────────────────────────
  // creator@demo spends big on a few reels; creator2 much less → demonstrates
  // „chi ha pagato di più" ranking dominance.
  const boostPlan: [number, number][] = [
    [0, 800], [1, 500], [2, 300], // creator@demo heavy
    [5, 60], [7, 40], [9, 25], // creator2 light
    [3, 120], [4, 10],
  ];
  for (const [idx, amount] of boostPlan) {
    const vid = videoRecords[idx];
    const author = idx % 2 === 0 ? creator : creator2;
    await prisma.boost.create({ data: { userId: author.id, videoId: vid.id, amount } });
    await prisma.walletTransaction.create({
      data: { userId: author.id, type: "BOOST_SPEND", amount, videoId: vid.id },
    });
  }

  // ─── Views & Likes (engagement) ────────────────────────────
  // pseudo-random but deterministic for reproducibility.
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const viewerIds = [viewer.id, creator.id, creator2.id];
  for (const vid of videoRecords) {
    const viewN = 5 + Math.floor(rand() * 60);
    for (let i = 0; i < viewN; i++) {
      await prisma.view.create({
        data: {
          videoId: vid.id,
          userId: i % 3 === 0 ? viewerIds[i % viewerIds.length] : null,
          watchTime: 5 + Math.floor(rand() * 30),
          completed: rand() > 0.3,
        },
      });
    }
    // viewer likes a few — focuses in Gaming & Comedy so the similarity-to-liked signal
    // surfaces similar reels in the feed of viewer@demo.
    const likeIt = rand() > 0.5;
    if (likeIt) {
      const cat = videoRecords.indexOf(vid) === -1 ? null : vid.categoryId;
      const inLikedCats =
        cat === catBySlug["gaming"].id || cat === catBySlug["comedy"].id || rand() > 0.7;
      if (inLikedCats) {
        await prisma.like.create({ data: { userId: viewer.id, videoId: vid.id } });
      }
    }
  }

  console.log("✓ Seed complete");
  console.log("  Demo login: creator@demo.app / demo123  ·  viewer@demo.app / demo123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });