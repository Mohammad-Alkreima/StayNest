const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "PropertyId is required"],
    },

    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "HostId is required"],
    },

    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "GuestId is required"],
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    numberOfNights: {
      type: Number,
      required: [true, "Number of nights is required"],
      min: [1, "Booking must contain at least one night"],
    },

    // ===== Pricing Snapshot =====
    // Stores the exact pricing details used when the booking was created.
    // These values remain unchanged even if the property prices change later.

    pricingSnapshot: {
      pricePerNight: {
        type: Number,
        required: [true, "Price per night is required"],
        min: [0, "Price per night cannot be negative"],
      },

      cleaningFee: {
        type: Number,
        default: 0,
        min: [0, "Cleaning fee cannot be negative"],
      },

      serviceFee: {
        type: Number,
        default: 0,
        min: [0, "Service fee cannot be negative"],
      },

      subtotal: {
        type: Number,
        required: [true, "Subtotal is required"],
        min: [0, "Subtotal cannot be negative"],
      },

      discountPercentage: {
        type: Number,
        default: 0,
        min: [0, "Discount percentage cannot be less than 0"],
        max: [100, "Discount percentage cannot exceed 100"],
      },

      discountAmount: {
        type: Number,
        default: 0,
        min: [0, "Discount amount cannot be negative"],
      },

      totalPrice: {
        type: Number,
        required: [true, "Total price is required"],
        min: [0, "Total price cannot be negative"],
      },
    },
 
  status: {
    type: String,
    enum: [
        "pending",
        "confirmed",
        "rejected",
        "expired",
        "cancelled",
        "completed",
    ],
    default: "pending",
  },

  // ===== Payment Information =====
  payment: {
    status: {
      type: String,
      enum: [
        "unpaid",
        "held",
        "released",
        "refunded",
        "partially_refunded",
      ],
      default: "unpaid",
    },

    method: {
      type: String,
      enum: ["creditCard", "bankTransfer", "paypal"],
      default: null,
    },

    amount: {
      type: Number,
      default: null,
      min: [0, "Payment amount cannot be negative"],
    },

    paidAt: {
      type: Date,
      default: null,
    },

    releasedAt: {
      type: Date,
      default: null,
    },

    platformCommission: {
      type: Number,
      required: [true, "Platform commission is required"],
      min: [0, "Platform commission cannot be negative"],
    },

    hostEarning: {
      type: Number,
      required: [true, "Host earning is required"],
      min: [0, "Host earning cannot be negative"],
    },

    refundPercentage: {
      type: Number,
      default: 0,
      min: [0, "Refund percentage cannot be less than 0"],
      max: [100, "Refund percentage cannot exceed 100"],
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: [0, "Refund amount cannot be negative"],
    },

    refundedAt: {
      type: Date,
      default: null,
    },
  },

   

    // ===== Cancellation Information =====
    cancelledFromStatus: {
      type: String,
      enum: ["pending", "confirmed"],
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledByRole: {
      type: String,
      enum: ["guest", "admin"],
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
      default: null,
    },


    // ===== Confirmation Information =====

    confirmedAt: {
      type: Date,
      default: null,
    },

    // ===== Rejection Information =====

    rejectedAt: {
        type: Date,
        default: null,
    },

    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },

    rejectionReason: {
        type: String,
        trim: true,
        maxlength: [500, "Rejection reason cannot exceed 500 characters"],
        default: null,
    },

    // ===== Expiration Information =====

    expiredAt: {
        type: Date,
        default: null,
    },
    
// ===== Completion Information =====
    completedAt: {
      type: Date,
      default: null,
    },


    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: true,
    virtuals: true
  },
);

// Prevent two active bookings from having the exact same property and dates.
// Partial date overlaps are checked inside the booking controller.
bookingSchema.index(
  {
    propertyId: 1,
    startDate: 1,
    endDate: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: {
        $in: ["pending", "confirmed"],
      },
    },
  },
);

bookingSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "bookingId",
  justOne: false
});

module.exports = mongoose.model("Booking", bookingSchema);