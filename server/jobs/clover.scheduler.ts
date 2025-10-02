import cron from "node-cron";
import { storage } from "../storage";
import { cloverService } from "../cloverService";

export function startCloverScheduler() {
  console.log("Starting Clover scheduler...");

  // Sync shifts daily at 3 AM (runs last 7 days to catch any late updates)
  cron.schedule("0 3 * * *", async () => {
    console.log("🔄 Starting daily Clover shift sync...");
    
    try {
      const integrations = await storage.getPosIntegrations();
      const cloverIntegrations = integrations.filter(
        (i) => i.provider === "clover" && i.isActive
      );

      for (const integration of cloverIntegrations) {
        try {
          console.log(`Syncing shifts for Clover integration: ${integration.id}`);
          const syncedCount = await cloverService.syncShifts(integration.id, 7);
          console.log(`✅ Synced ${syncedCount} shifts for integration ${integration.id}`);
        } catch (error) {
          console.error(`❌ Failed to sync shifts for integration ${integration.id}:`, error);
        }
      }

      console.log("✅ Daily Clover shift sync completed");
    } catch (error) {
      console.error("❌ Daily Clover shift sync failed:", error);
    }
  });

  console.log("Clover scheduler started successfully");
}
