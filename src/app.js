// setup
require("dotenv").config();
const express = require("express");
const app = express();
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const cookies = require("cookie-parser");
const { limiter } = require("./middlewares/limiter");
const xssSanitize = require("./middlewares/xss");
const { default: mongoose } = require("mongoose");
const updateVisibleReviews = require("./cron/reviewCron");

const passport = require("passport");
require("./utils/passport");

const startBookingCompletionJob = require("./jobs/bookingCompletion.job");

const startBookingExpirationJob = require("./jobs/bookingExpiration.job");

const startPaymentReleaseJob = require("./jobs/paymentRelease.job");

// middlewares
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require("morgan")("dev"));
app.use(cookies());
app.use(passport.initialize());
app.use(xssSanitize);

// apis
app.get("/api/health", (req, res) => res.status(200).json("API is Healthy"));
app.use("/api/v1/auth", require("./routes/auth.route"));
app.use("/api/v1/uploads", require("./routes/uploads.route"));
app.use("/api/v1/properties", require("./routes/property.route"));
app.use("/api/v1/bookings", require("./routes/booking.route"));
app.use("/api/v1/reviews", require("./routes/review.route"));
app.use("/api/v1/disputes", require("./routes/dispute.route"));
// Handle requests that do not match any existing route
app.use(notFound);
// Global error-handling middleware must be registered last
app.use(errorHandler);


// listen
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Storage of connected users (UserId -> SocketId)
const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // When a user (whether host or admin) logs in and links their account to the socket
    socket.on("register", (userId) => {
        onlineUsers.set(userId, socket.id);
        console.log(`User registered with ID: ${userId} and Socket ID: ${socket.id}`);
    });

    socket.on("disconnect", () => {
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                console.log(`User disconnected: ${userId}`);
                break;
            }
        }
    });
});

// Making io and onlineUsers available within the Express app
app.set("io", io);
app.set("onlineUsers", onlineUsers);

const PORT = process.env.PORT;
const MONGODB_URL = process.env.MONGODB_URL;
mongoose
  .connect(MONGODB_URL)
  .then(() => {
    // Start scheduled jobs only after MongoDB is connected
    updateVisibleReviews();
    startBookingCompletionJob();
    startBookingExpirationJob();
    startPaymentReleaseJob();

    server.listen(PORT, () => {
      console.log("Connected to MongoDB");
      console.log(`Server Is Running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Mongodb Error:", err.message);
  });
