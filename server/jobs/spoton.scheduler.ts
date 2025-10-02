import cron from "node-cron";
import { storage } from "../storage";
import { posService } from "../posService";

const POLL = process.env.SPOTON_POLL_INTERVAL_MINUTES 
  ? `*/${process.env.SPOTON_POLL_INTERVAL_MINUTES} * * * *` 
  : "*/1 * * * *";

export function startSpotOnSchedulers() {
  console.log("Starting SpotOn schedulers...");

  // Poll for orders every minute
  cron.schedule(POLL, async () => {
    const integrations = await storage.getPosIntegrations();
    for (const i of integrations) {
      if (!i.isActive || i.provider !== "spoton") continue;
      try {
        const result = await posService.pollSpotOnOrders(i.id);
        if (result.ordersProcessed > 0) {
          console.log(`SpotOn poll completed: ${result.ordersProcessed} orders processed for integration ${i.id}`);
        }
      } catch (e) {
        console.error("SpotOn poll failed", { integrationId: i.id, err: String(e) });
      }
    }
  });

  // Poll for time clock entries every minute
  cron.schedule(POLL, async () => {
    const integrations = await storage.getPosIntegrations();
    for (const i of integrations) {
      if (!i.isActive || i.provider !== "spoton") continue;
      try {
        const result = await posService.pollSpotOnTimeclock(i.id);
        if (result.punchesProcessed > 0) {
          console.log(`SpotOn timeclock poll: ${result.punchesProcessed} punches processed for integration ${i.id}`);
        }
      } catch (e) {
        console.error("SpotOn timeclock poll failed", { integrationId: i.id, err: String(e) });
      }
    }
  });

  cron.schedule("10 3 * * *", async () => {
    console.log("Starting SpotOn daily backfill...");
    const integrations = await storage.getPosIntegrations();
    for (const i of integrations) {
      if (!i.isActive || i.provider !== "spoton") continue;
      try {
        const hours = Number(process.env.SPOTON_BACKFILL_HOURS ?? 26);
        const now = new Date();
        let totalOrders = 0;
        
        for (let offset = hours * 60; offset > 0; offset -= 30) {
          const credentials = i.credentials as { apiKey?: string };
          if (!credentials?.apiKey) continue;

          const baseUrl = posService["getBaseUrl"]("spoton", i.environment);
          const end = new Date(now.getTime() - (offset - 30) * 60 * 1000);
          const start = new Date(now.getTime() - offset * 60 * 1000);
          
          const params = new URLSearchParams({
            updatedAtStart: toRFC3339Z(start),
            updatedAtEnd: toRFC3339Z(end),
          });

          try {
            const url = `${baseUrl}/locations/${encodeURIComponent(i.merchantId)}/orders?${params}`;
            const res = await fetch(url, { headers: { "x-api-key": credentials.apiKey! } });
            
            if (!res.ok) {
              console.error(`SpotOn backfill fetch failed: ${res.status}`);
              continue;
            }

            const orders = await res.json();
            for (const order of orders ?? []) {
              const existing = await storage.getPosSaleByOrderId(i.id, order.id);
              if (existing) continue;

              const total = order.totalAmount?.amount ?? "0";
              const createdAt = order.createdAt ?? new Date().toISOString();

              const posSale = await storage.createPosSale({
                posOrderId: order.id,
                posIntegrationId: i.id,
                locationId: i.locationId,
                total,
                orderDate: new Date(createdAt),
                inventoryProcessed: false,
              });

              const addItem = async (li: any) => {
                const qty = Number(li.quantity ?? "1");
                const unit = li.preDiscountsAmount?.amount ?? "0";
                const totalLine = li.totalAmount?.amount ?? "0";
                await storage.createPosSaleItem({
                  posSaleId: posSale.id,
                  itemName: li.name,
                  quantity: qty,
                  unitPrice: unit,
                  totalPrice: totalLine,
                });
              };

              for (const check of order.checks ?? []) {
                for (const li of check.items ?? []) await addItem(li);
                for (const guest of check.guests ?? []) {
                  for (const li of guest.items ?? []) await addItem(li);
                }
              }

              totalOrders++;
            }
          } catch (sliceError) {
            console.error(`SpotOn backfill slice failed for integration ${i.id}`, sliceError);
          }
        }
        
        if (totalOrders > 0) {
          console.log(`SpotOn backfill completed: ${totalOrders} orders processed for integration ${i.id}`);
          await storage.updatePosIntegration(i.id, { lastSyncAt: new Date().toISOString() as any });
        }
      } catch (e) {
        console.error("SpotOn backfill failed", { integrationId: i.id, err: String(e) });
      }
    }
  });

  console.log("SpotOn schedulers started successfully");
}

function toRFC3339Z(d: Date): string {
  return new Date(Math.floor(d.getTime() / 1000) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}
