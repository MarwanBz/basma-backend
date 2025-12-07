import { RequestService } from "@/services/request.service";
import cron from "node-cron";
import { logger } from "@/config/logger";

const DEFAULT_CUTOFF_DAYS = 3;

export const startRequestAutoCloseJob = (
  requestService = new RequestService(),
  days = DEFAULT_CUTOFF_DAYS
) =>
  cron.schedule("0 2 * * *", async () => {
    try {
      const processed = await requestService.autoClosePendingRequests(days);
      if (processed > 0) {
        logger.info(
          `Auto-close job processed ${processed} requests after ${days} days`
        );
      }
    } catch (error) {
      logger.error("Auto-close job failed", { error });
    }
  });
