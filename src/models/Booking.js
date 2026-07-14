const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    propertyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Property", 
        required: [true, "PropertyId is required"] 
    },
    guestId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: [true, "GuestId is required"] 
    },
    startDate: { 
        type: Date, 
        required: [true, "Statrt date is required"]
    },
    endDate: { 
        type: Date, 
        required: [true, "End date is required"] 
    },
    numberOfNights: { 
        type: Number, 
        required: [true, "Number of nights is required"] 
    },
    totalPrice: { 
        type: Number, 
        required: [true, "Total price is required"] 
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
}, { 
    timestamps: true,
    strict: true, // 🛡️ منع Mass Assignment — رفض أي حقل غير معرّف في الـ Schema
});

// 🛡️ فهرس مركب فريد لمنع Race Condition (Overbooking)
// يمنع إنشاء حجزين متعارضين لنفس العقار ونفس الفترة
bookingSchema.index(
    { propertyId: 1, startDate: 1, endDate: 1 },
    {
        unique: true,
        partialFilterExpression: {
            isDeleted: false,
            status: { $in: ["pending", "confirmed"] },
        },
    }
);

module.exports = mongoose.model("Booking", bookingSchema);