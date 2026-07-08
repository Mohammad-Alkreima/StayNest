# StayNest

## Actors
SuperAdmin, Guest, Host

## Features
- منع تعارض الحجوزات
- حساب السعر
- تقييم بعد انتهاء الاقامة
- البحث والتصفية
- لوحة ارباح للمضيف

## Collections
- User {
    name,
    email,
    password,
    role: {
        type: String,
        enum: [guest, host, admin]
    }
    phone: String,
    profileImage: String ,
    hasDispute: { 
        type: Boolean,
        default: false
    },
    totalBookings: {
        type: Number,
        default: 0
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
} 

- Property: {
    propertyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Property'
    },
    guestId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    startDate: Date,
    endDate: Date,
    numberOfNights: Number,
    totalPrice: Number,
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
        default: 'pending' 
    },
    paymentMethod: { 
        type: String, 
        enum: ['creditCard', 'bankTransfer', 'cash', 'paypal'] 
    },
    paymentStatus: { 
        type: String, 
        enum: ['paid', 'unpaid', 'pending'], 
        default: 'pending' 
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}

- Booking: {
    propertyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Property'
    },
    guestId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    startDate: Date,
    endDate: Date,
    numberOfNights: Number,
    totalPrice: Number,
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
        default: 'pending' 
    },
    paymentMethod: { 
        type: String, 
        enum: ['creditCard', 'bankTransfer', 'cash', 'paypal'] 
    },
    paymentStatus: { 
        type: String, 
        enum: ['paid', 'unpaid', 'pending'], 
        default: 'pending' 
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}

- Review: {
    bookingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Booking'
    },
    guestId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    hostId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    rating: { 
        type: Number, 
        min: 1, 
        max: 5 
    },
    comment: String ,
    isVisible: Boolean},
    visibleFrom: Date
}

## Relationships:
User(host) to Property (1:M): One host can own multiple properties.

User(guset) to Booking (1:M): One guest can make multiple bookings.

Property to Booking (1:M): One property can have multiple bookings.

Booking to Review (1:1): Each booking results in exactly one review entity.