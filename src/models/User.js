const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is reuired"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is reqired"],
        unique: [true, "Email is already exsist"],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        minLength: 8,
        required: [true, "password is required"]
    },
    role: {
        type: String,
        enum: ["guest", "host", "admin"],
        default: "guest"
    },
    phone: String,
    profileImage: String ,
    totalBookings: {
        type: Number,
        default: 0
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    // block mechanism to sometime if he get failed 5 times
    blocked: { 
        type: Boolean,
        default: false
    },
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: Date
}, {
    timestamps: true
});

userSchema.pre("save", async function(next) {
    // إذا كانت كلمة السر تبدأ بـ $argon2، فهذا يعني أنها مشفرة بالفعل!
    if (this.password.startsWith("$argon2")) {
        return next();
    }
    
    // غير ذلك، قم بتشفيرها
    this.password = await argon2.hash(this.password);
    next();
});

module.exports = mongoose.model("User", userSchema);