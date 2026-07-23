const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async (email, subject, message) => {
    const transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: Number(process.env.PORT_MAIL),
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
    await transporter.sendMail({
        from: "Support <noreply@myapp.com>",
        to: email,
        subject: subject,
        text: message
    });
};



module.exports = sendEmail;