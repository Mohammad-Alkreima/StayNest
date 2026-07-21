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
    }, // من قدم الشكوى
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
    }, // سبب النزاع
    winner: {
      type: String,
      enum: ["guest", "host", null],
      default: null,
    },
    resolutionType: {
      type: String,
      enum: ["fullRefund", "partialRefund", "releasePayment", "noRefund", null],
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
    adminNotes: String, // ملاحظات الـ Super Admin
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Dispute", disputeSchema);
