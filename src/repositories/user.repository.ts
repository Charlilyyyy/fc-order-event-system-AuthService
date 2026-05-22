import { comparePassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";

const userListSelect = {
  id: true,
  email: true,
  emailVerified: true,
  emailVerifiedAt: true,
  phone: true,
  phoneVerified: true,
  status: true,
  locale: true,
  timezone: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: {
      displayName: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  },
} as const;

const publicUserSelect = {
  id: true,
  email: true,
} as const;

export async function findAllUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: userListSelect,
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: publicUserSelect,
  });
}

export async function createUserWithPassword(
  email: string,
  passwordHash: string,
): Promise<Auth.User> {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const user = await prisma.user.create({
    data: {
      email,
      status: "pending",
      emailVerified: false,
      credentials: {
        create: {
          type: "password",
          provider: "local",
          secretHash: passwordHash,
          isPrimary: true,
        },
      },
      profile: {
        create: {},
      },
    },
    select: publicUserSelect,
  });

  return user satisfies Auth.User;
}

export async function findUserForPasswordReset(email: string) {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      credentials: {
        where: { type: "password", isPrimary: true },
        select: { id: true },
        take: 1,
      },
    },
  });
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.credential.updateMany({
      where: { userId, type: "password", isPrimary: true },
      data: { secretHash: passwordHash },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { passwordChangedAt: new Date() },
    }),
  ]);
}

export async function findUserSignupState(email: string) {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      status: true,
    },
  });
}

export async function activateUserEmail(userId: string): Promise<Auth.User> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: "active",
    },
    select: publicUserSelect,
  });

  return user satisfies Auth.User;
}

export async function findUserByEmailAndPassword(
  email: string,
  password: string,
): Promise<Auth.User> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      status: true,
      credentials: {
        where: { type: "password", isPrimary: true },
        select: { secretHash: true },
        take: 1,
      },
    },
  });

  const credential = user?.credentials[0];
  if (!user || !credential?.secretHash) {
    throw new Error("Invalid email or password");
  }

  const valid = await comparePassword(password, credential.secretHash);
  if (!valid) throw new Error("Invalid email or password");

  if (!user.emailVerified || user.status !== "active") {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  return { id: user.id, email: user.email } satisfies Auth.User;
}

export async function findOrCreateUserFromGoogle(
  account: Auth.GoogleAccount,
): Promise<Auth.User> {
  const existingIdentity = await prisma.identity.findUnique({
    where: {
      provider_providerUserId: {
        provider: "google",
        providerUserId: account.googleId,
      },
    },
    include: { user: { select: publicUserSelect } },
  });

  if (existingIdentity?.user) {
    await prisma.user.update({
      where: { id: existingIdentity.user.id },
      data: {
        lastLoginAt: new Date(),
        emailVerified: account.emailVerified || undefined,
      },
    });
    return existingIdentity.user satisfies Auth.User;
  }

  const userByEmail = await findUserByEmail(account.email);

  if (userByEmail) {
    await prisma.$transaction([
      prisma.identity.create({
        data: {
          userId: userByEmail.id,
          provider: "google",
          providerUserId: account.googleId,
          email: account.email,
          profileData: {
            name: account.name,
            picture: account.picture,
          },
        },
      }),
      prisma.user.update({
        where: { id: userByEmail.id },
        data: {
          lastLoginAt: new Date(),
          emailVerified: account.emailVerified || undefined,
        },
      }),
    ]);

    return userByEmail satisfies Auth.User;
  }

  const user = await prisma.user.create({
    data: {
      email: account.email,
      status: "active",
      emailVerified: account.emailVerified,
      emailVerifiedAt: account.emailVerified ? new Date() : undefined,
      lastLoginAt: new Date(),
      profile: {
        create: {
          displayName: account.name,
          avatarUrl: account.picture,
        },
      },
      identities: {
        create: {
          provider: "google",
          providerUserId: account.googleId,
          email: account.email,
          profileData: {
            name: account.name,
            picture: account.picture,
          },
        },
      },
    },
    select: publicUserSelect,
  });

  return user satisfies Auth.User;
}
