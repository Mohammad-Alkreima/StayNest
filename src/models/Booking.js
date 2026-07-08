const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    propertyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Property", 
        required: true 
    },
    guestId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    startDate: { 
        type: Date, 
        required: true },
    endDate: { 
        type: Date, 
        required: true 
    },
    numberOfNights: { 
        type: Number, 
        required: true 
    },
    totalPrice: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ["pending", "confirmed", "cancelled", "completed"], 
        default: "pending" 
    },
    paymentMethod: { 
        type: String, 
        enum: ["creditCard", "bankTransfer", "cash", "paypal"] 
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
}, { 
    timestamps: true 
});

module.exports = mongoose.model("Booking", bookingSchema);