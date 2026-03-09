import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function toTitleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

const connectionString = getRequiredEnv("DATABASE_URL");
const adminEmail = getRequiredEnv("SEED_ADMIN_EMAIL").toLowerCase();
const adminUsername = getRequiredEnv("SEED_ADMIN_USERNAME");
const adminPassword = getRequiredEnv("SEED_ADMIN_PASSWORD");
const adminName = process.env.SEED_ADMIN_NAME || "BU Tram Admin";
const adminRoleKey = process.env.SEED_ADMIN_ROLE || "admin";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  const passwordHash = await hashPassword(adminPassword);

  const role = await prisma.role.upsert({
    where: {
      key: adminRoleKey,
    },
    update: {
      name: toTitleCase(adminRoleKey),
    },
    create: {
      key: adminRoleKey,
      name: toTitleCase(adminRoleKey),
    },
  });

  const existingUser = await prisma.user.findUnique({
    where: {
      email: adminEmail,
    },
    select: {
      id: true,
    },
  });

  const user = existingUser
    ? await prisma.user.update({
        where: {
          email: adminEmail,
        },
        data: {
          name: adminName,
          username: adminUsername,
          displayUsername: adminUsername,
          emailVerified: true,
        },
      })
    : await prisma.user.create({
        data: {
          email: adminEmail,
          emailVerified: true,
          name: adminName,
          username: adminUsername,
          displayUsername: adminUsername,
        },
      });

  const credentialAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "credential",
    },
    select: {
      id: true,
    },
  });

  if (credentialAccount) {
    await prisma.account.update({
      where: {
        id: credentialAccount.id,
      },
      data: {
        accountId: user.id,
        password: passwordHash,
      },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: passwordHash,
      },
    });
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    },
  });

  console.log(`Seeded admin user ${adminEmail} with role ${adminRoleKey}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed admin user");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
