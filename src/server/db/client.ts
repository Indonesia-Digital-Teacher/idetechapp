import { createPool, type Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "mysql://root@localhost:3306/idetech";

function createDatabasePool(): Pool {
  return createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
}

export const pool = createDatabasePool();
export const db = drizzle(pool, { schema, mode: "default" });
