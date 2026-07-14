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

// middlewares
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require("morgan")("dev"));
app.use(cookies());
app.use(xssSanitize);

// apis
app.get("/api/health", (req, res) => res.status(200).json("API is Healthy"));
app.use("/api/v1/auth", require("./routes/auth.route"));
app.use("/api/v1/properties", require("./routes/property.route"));
app.use("/api/v1/bookings", require("./routes/booking.route"));
app.use(errorHandler);
app.use(notFound);

// listen
const PORT = process.env.PORT;
const MONGODB_URL = process.env.MONGODB_URL;
mongoose
  .connect(MONGODB_URL)
  .then(() => {
    app.listen(PORT, () => {
      console.log("✅ Connected to MongoDB");
      console.log(`Server Is Running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Mongodb Error:", err.message);
  });
