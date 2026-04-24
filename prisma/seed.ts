import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { CHARACTER_DATA } from "../src/lib/characters";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding characters...");

  for (const char of CHARACTER_DATA) {
    await prisma.character.upsert({
      where: { name: char.name },
      update: {
        subtitle: char.subtitle,
        tags: char.tags,
        description: char.description,
        avatarUrl: char.avatarUrl,
        systemPrompt: char.systemPrompt,
        appearance: char.appearance,
        voiceId: char.voiceId,
      },
      create: {
        name: char.name,
        subtitle: char.subtitle,
        tags: char.tags,
        description: char.description,
        avatarUrl: char.avatarUrl,
        systemPrompt: char.systemPrompt,
        appearance: char.appearance,
        voiceId: char.voiceId,
      },
    });
    console.log(`  ✓ ${char.name} (${char.subtitle})`);
  }

  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
