const cron = require("node-cron");
const Review = require("../models/Review");

const updateVisibleReviews = () => {
    // run every day at 12:00 AM
    cron.schedule("0 0 * * *", async () => {
        try {
            console.log("Running auto-visibility cron job...");

            const now = new Date();
            const result = await Review.updateMany(
                { 
                    isVisible: false, 
                    visibleFrom: { $lte: now } 
                },
                { 
                    isVisible: true 
                }
            );

            console.log(`Successfully updated ${result.modifiedCount} reviews.`);
        } catch (error) {
            console.error("Error in review cron job:", error);
        }
    });
};

module.exports = updateVisibleReviews;