const argon2 = require("argon2")
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
    // reset password
    passwordResetToken: String,
    passwordResetExpires: Date,
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

userSchema.pre("save", async function() {
    // if password starts argon2 => the password is encrypted
    if (this.password.startsWith("$argon2")) {
        return;
    }
    
    // or encryption password
    this.password = await argon2.hash(this.password);
});

module.exports = mongoose.model("User", userSchema);