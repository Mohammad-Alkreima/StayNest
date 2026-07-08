require("dotenv").config();
const User = require("../models/User");
const connectDB = require("../utils/connectDB");
const passwordService = require("../utils/passwordService");

const createAdmin = async () => {
    await connectDB();
    
    const adminData = {
        name: process.env.ADMIN_NAME,
        phone: process.env.ADMIN_PHONE,
        email: process.env.ADMIN_EMAIL,
        password: await passwordService.hash(process.env.ADMIN_PASSWORD),
        role: "admin"
    }

    const admin = await User.findOne({ role: "admin" });

    if(admin) {
        throw new Error("Admin is already exist");
    }

    await User.create(adminData);
}

createAdmin()
    .then(e => {
        console.log("DONE Successfully");
    })
    .catch(err => {
        console.log("ERROR:", err.message);
    })
    .finally(() => {
        console.log("END THE TASK");
        process.exit();
    })