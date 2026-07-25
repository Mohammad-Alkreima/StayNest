const cron = require("node-cron");

const {
  releaseEligiblePayments,
} = require("../services/payment.service");

const startPaymentReleaseJob = () => {
  // Run at minute 0 of every hour
  cron.schedule(
    "0 * * * *",
    async () => {
      console.log("[Payment Release Job] Started.");

      try {
        const result = await releaseEligiblePayments();

        console.log("[Payment Release Job] Completed.", {
          foundCount: result.foundCount,
          releasedCount: result.releasedCount,
          failedCount: result.failedCount,
        });

        if (result.failedCount > 0) {
          console.error(
            "[Payment Release Job] Failed bookings:",
            result.failedBookings,
          );
        }
      } catch (error) {
        console.error("[Payment Release Job] Failed:", error);
      }
    },
    {
      noOverlap: true,
    },
  );
};

module.exports = startPaymentReleaseJob;