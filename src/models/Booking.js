const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: [true, "PropertyId is required"]
        },

        hostId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "HostId is required"]
        },

        guestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "GuestId is required"]
        },

        startDate: {
            type: Date,
            required: [true, "Start date is required"]
        },

        endDate: {
            type: Date,
            required: [true, "End date is required"]
        },

        numberOfNights: {
            type: Number,
            required: [true, "Number of nights is required"],
            min: [1, "Booking must contain at least one night"]
        },

        pricePerNightAtBooking: {
            type: Number,
            required: [true, "Price per night at booking is required"],
        },

        cleaningFeeAtBooking: {
            type: Number,
            default: 0,
            min: [0, "Cleaning fee cannot be negative"]
        },

        serviceFeeAtBooking: {
            type: Number,
            default: 0,
            min: [0, "Service fee cannot be negative"]
        },

        subtotal: {
            type: Number,
            required: [true, "Subtotal is required"]
        },

        totalPrice: {
            type: Number,
            required: [true, "Total price is required"],
            min: [0, "Total price cannot be negative"]
        },

        status: {
            type: String,
            enum: ["pending", "confirmed", "cancelled", "completed"],
            default: "pending"
        },

        paymentMethod: {
            type: String,
            enum: ["creditCard", "bankTransfer", "cash", "paypal"],
            default: "bankTransfer"
        },

        paymentStatus: {
            type: String,
            enum: ["paid", "unpaid", "pending"],
            default: "pending"
        },

        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true,
        strict: true
    }
);


// Prevent two active bookings from having the exact same property and dates.

bookingSchema.index(
    {
        propertyId: 1,
        startDate: 1,
        endDate: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            isDeleted: false,
            status: {
                $in: ["pending", "confirmed"]
            }
        }
    }
);

module.exports = mongoose.model("Booking", bookingSchema);