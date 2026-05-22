import { createApp } from "./app.js";
import { env, validateEnv } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

validateEnv();

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(
    `[${env.serviceName}] listening on http://localhost:${env.port} (${env.nodeEnv})`,
  );
});

async function shutdown(signal: string) {
  console.log(`[${env.serviceName}] ${signal} received, shutting down...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
