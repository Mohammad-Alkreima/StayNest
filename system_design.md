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
} 

- Property: {
    title,
    description,
    location,
    pricePerNight,
    amenities: [wifi, pool, .....],
    cleaningFee,
    serviceFee,
    hostId: {
        type: mongoose.schema.Types.ObjectId,
        ref: "User"
    }
}

- Booking: {
    staetDate,
    endDate,
    totalPrice,
    status: {
        type: String,
        enum: [free, pending, confirmed, cancelled],
        default: free
    }
    properyId: {
        type: mongoose.schema.Types.ObjectId,
        ref: "Property",
    }
    guestId: {
        type: mongoose.schema.Types.ObjectId,
        ref: "User"
    }
}

- Review: {
    guestRating,
    hostRating,
    guestComment,
    hostComment,
    createdAt,
    bookingId: {
        type: mongoose.schema.Types.ObjectId,
        ref: "Booking"
    }
}

## Relationships:
User(host) to Property (1:M): One host can own multiple properties.

User(guset) to Booking (1:M): One guest can make multiple bookings.

Property to Booking (1:M): One property can have multiple bookings.

Booking to Review (1:1): Each booking results in exactly one review entity.