const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: Number(process.env.PORT_MAIL),
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
    // api mailtraip cd2b9c4fa301cf66e0dd4193d04d1bb2
    await transporter.sendMail({
        from: "Support <noreply@myapp.com>",
        to: email,
        subject: "password reset",
        text: `copy this token to change your password: ${token}`
    });
};



module.exports = sendEmail;