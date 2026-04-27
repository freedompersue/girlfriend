import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const LOCAL_URL = "postgresql://postgres:postgres@localhost:5432/girlfriend?schema=public";
const NEON_URL = "postgresql://neondb_owner:npg_Ud0g6SZnXLJV@ep-solitary-river-amidmh88.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require";

function makeClient(url: string) {
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

async function main() {
  const local = makeClient(LOCAL_URL);
  const neon = makeClient(NEON_URL);

  try {
    // 1. Characters
    const characters = await local.character.findMany();
    console.log(`Characters: ${characters.length}`);
    for (const c of characters) {
      await neon.character.upsert({
        where: { name: c.name },
        update: {
          subtitle: c.subtitle,
          tags: c.tags,
          description: c.description,
          avatarUrl: c.avatarUrl,
          systemPrompt: c.systemPrompt,
          appearance: c.appearance,
          baseImageUrl: c.baseImageUrl,
          voiceId: c.voiceId,
        },
        create: c,
      });
    }
    console.log("  ✓ Characters migrated");

    // 2. Users
    const users = await local.user.findMany();
    console.log(`Users: ${users.length}`);
    for (const u of users) {
      await neon.user.upsert({
        where: { id: u.id },
        update: {},
        create: u,
      });
    }
    console.log("  ✓ Users migrated");

    // 3. Sessions
    const sessions = await local.session.findMany();
    console.log(`Sessions: ${sessions.length}`);
    for (const s of sessions) {
      await neon.session.upsert({
        where: { id: s.id },
        update: {},
        create: s,
      }).catch(() => {});
    }
    console.log("  ✓ Sessions migrated");

    // 4. Accounts
    const accounts = await local.account.findMany();
    console.log(`Accounts: ${accounts.length}`);
    for (const a of accounts) {
      await neon.account.upsert({
        where: { id: a.id },
        update: {},
        create: a,
      }).catch(() => {});
    }
    console.log("  ✓ Accounts migrated");

    // 5. Affinities
    const affinities = await local.affinity.findMany();
    console.log(`Affinities: ${affinities.length}`);
    for (const a of affinities) {
      await neon.affinity.upsert({
        where: { id: a.id },
        update: {},
        create: a,
      }).catch(() => {});
    }
    console.log("  ✓ Affinities migrated");

    // 6. Messages
    const messages = await local.message.findMany({ orderBy: { createdAt: "asc" } });
    console.log(`Messages: ${messages.length}`);
    for (const m of messages) {
      await neon.message.upsert({
        where: { id: m.id },
        update: {},
        create: m,
      }).catch(() => {});
    }
    console.log("  ✓ Messages migrated");

    // 7. User Profiles
    const profiles = await local.userProfile.findMany();
    console.log(`UserProfiles: ${profiles.length}`);
    for (const p of profiles) {
      await neon.userProfile.upsert({
        where: { id: p.id },
        update: {},
        create: p,
      }).catch(() => {});
    }
    console.log("  ✓ UserProfiles migrated");

    // 8. CheckIns
    const checkIns = await local.checkIn.findMany();
    console.log(`CheckIns: ${checkIns.length}`);
    for (const c of checkIns) {
      await neon.checkIn.upsert({
        where: { id: c.id },
        update: {},
        create: c,
      }).catch(() => {});
    }
    console.log("  ✓ CheckIns migrated");

    // 9. Notifications
    const notifications = await local.notification.findMany();
    console.log(`Notifications: ${notifications.length}`);
    for (const n of notifications) {
      await neon.notification.upsert({
        where: { id: n.id },
        update: {},
        create: n,
      }).catch(() => {});
    }
    console.log("  ✓ Notifications migrated");

    // 10. MoodEntries
    const moodEntries = await local.moodEntry.findMany();
    console.log(`MoodEntries: ${moodEntries.length}`);
    for (const m of moodEntries) {
      await neon.moodEntry.upsert({
        where: { id: m.id },
        update: {},
        create: m,
      }).catch(() => {});
    }
    console.log("  ✓ MoodEntries migrated");

    // 11. Milestones
    const milestones = await local.milestone.findMany();
    console.log(`Milestones: ${milestones.length}`);
    for (const m of milestones) {
      await neon.milestone.upsert({
        where: { id: m.id },
        update: {},
        create: m,
      }).catch(() => {});
    }
    console.log("  ✓ Milestones migrated");

    // 12. ExternalLinks
    const externalLinks = await local.externalLink.findMany();
    console.log(`ExternalLinks: ${externalLinks.length}`);
    for (const e of externalLinks) {
      await neon.externalLink.upsert({
        where: { id: e.id },
        update: {},
        create: e,
      }).catch(() => {});
    }
    console.log("  ✓ ExternalLinks migrated");

    // 13. Subscriptions
    const subscriptions = await local.subscription.findMany();
    console.log(`Subscriptions: ${subscriptions.length}`);
    for (const s of subscriptions) {
      await neon.subscription.upsert({
        where: { id: s.id },
        update: {},
        create: s,
      }).catch(() => {});
    }
    console.log("  ✓ Subscriptions migrated");

    // 14. CreditBalances
    const creditBalances = await local.creditBalance.findMany();
    console.log(`CreditBalances: ${creditBalances.length}`);
    for (const c of creditBalances) {
      await neon.creditBalance.upsert({
        where: { id: c.id },
        update: {},
        create: c,
      }).catch(() => {});
    }
    console.log("  ✓ CreditBalances migrated");

    // 15. Transactions
    const transactions = await local.transaction.findMany();
    console.log(`Transactions: ${transactions.length}`);
    for (const t of transactions) {
      await neon.transaction.upsert({
        where: { id: t.id },
        update: {},
        create: t,
      }).catch(() => {});
    }
    console.log("  ✓ Transactions migrated");

    console.log("\n✅ Migration complete!");
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    await local.$disconnect();
    await neon.$disconnect();
  }
}

main();
