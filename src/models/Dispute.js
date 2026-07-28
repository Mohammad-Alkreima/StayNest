const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "BookingId is required"],
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "UserId is required"],
    }, // User who submitted the dispute
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["host-to-guest", "guest-to-host"],
      required: true,
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
    }, // Reason for the dispute
    winner: {
      type: String,
      enum: ["guest", "host", null],
      default: null,
    },
    resolutionType: {
      type: String,
      enum: [
        "fullRefund",
        "partialRefund",
        "noRefund",
        null,
      ],
      default: null,
    },
    refundPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved"],
      default: "open",
    },
    adminNotes: String, // Super Admin notes
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Dispute", disputeSchema);
