const BOOKING_BLOCK_POLICY = {
  // Count relevant cancellations during the last 30 days.
  evaluationPeriodDays: 30,

  // Warn after the third confirmed cancellation.
  warningAfterConfirmedCancellations: 3,

  // Block after the fifth confirmed cancellation.
  maximumConfirmedCancellations: 5,

  // Booking restriction lasts for 30 days.
  blockDurationDays: 30,
};

module.exports = BOOKING_BLOCK_POLICY;