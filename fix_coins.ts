import { db } from "./src/server/db/client";
import { users, coinTransactions } from "./src/server/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Fetching users with welcomeBonusClaimed...");
  const allUsers = await db.select().from(users).where(eq(users.welcomeBonusClaimed, true));
  
  for (const user of allUsers) {
    const txs = await db.select().from(coinTransactions).where(eq(coinTransactions.userId, user.id));
    const expectedCoins = txs.reduce((sum, tx) => sum + tx.amount, 0);
    
    if (user.coins < expectedCoins) {
      console.log(`Fixing user ${user.name}: Current ${user.coins}, Expected ${expectedCoins}`);
      await db.update(users).set({ coins: expectedCoins }).where(eq(users.id, user.id));
    }
  }
  console.log("Done!");
  process.exit(0);
}
run().catch(console.error);
