import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const GLOBAL_ORG_ID = "00000000-0000-0000-0000-000000000000";
const SEED_EMAIL = "alice@example.com";
const SEED_PASSWORD = "change_me";

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  await prisma.organization.upsert({
    where: { id: GLOBAL_ORG_ID },
    update: {},
    create: {
      id: GLOBAL_ORG_ID,
      slug: "_global_",
      name: "Global (system)",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: SEED_EMAIL },
    update: {},
    create: {
      email: SEED_EMAIL,
      status: "active",
      emailVerified: true,
      profile: {
        create: {
          displayName: "Alice",
          firstName: "Alice",
        },
      },
    },
  });

  const existingCredential = await prisma.credential.findFirst({
    where: { userId: user.id, type: "password", isPrimary: true },
  });

  if (existingCredential) {
    await prisma.credential.update({
      where: { id: existingCredential.id },
      data: { secretHash: passwordHash },
    });
  } else {
    await prisma.credential.create({
      data: {
        userId: user.id,
        type: "password",
        provider: "local",
        secretHash: passwordHash,
        isPrimary: true,
      },
    });
  }

  console.log("Seed completed.");
  console.log(`Login with ${SEED_EMAIL} / ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
