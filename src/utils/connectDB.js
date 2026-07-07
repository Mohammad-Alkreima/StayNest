require("dotenv").config();
const { default: mongoose } = require("mongoose");

const connectDB = async () => {
    mongoose.connect(process.env.MONGODB_URL)
        .then(() => {
            console.log("Connected to database successfully")
        })
        .catch(err => {
            console.log("Mongodb Error:", err.message);
        })
}

module.exports = connectDB