import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

/**
 * Neon's serverless driver speaks Neon's own WebSocket proxy protocol, not
 * plain Postgres wire protocol — it only works against a real Neon endpoint.
 * Local dev runs a plain Postgres container, so pick the adapter based on
 * which kind of host DATABASE_URL actually points at.
 */
export function createPrismaAdapter(connectionString: string | undefined) {
  if (connectionString?.includes(".neon.tech")) {
    return new PrismaNeon({ connectionString });
  }
  return new PrismaPg({ connectionString });
}
