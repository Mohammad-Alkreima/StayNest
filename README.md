# StayNest

> A fully-featured property booking platform backend (like Airbnb) — Node.js/Express API

A comprehensive backend system for managing property bookings including authentication, property management, booking with pricing snapshots and loyalty discounts, a dual-sided review system with visibility control, dispute resolution, payment escrow with scheduled release, real-time notifications via Socket.io, and XSS protection.

---

## Tech Stack

| Technology | Usage |
|------------|-------|
| **Node.js** | Runtime |
| **Express 5** | Web framework |
| **MongoDB + Mongoose 9** | Database & ODM |
| **JWT (jsonwebtoken)** | Authentication (Access + Refresh Tokens) |
| **Argon2** | Password hashing |
| **Passport.js + Google OAuth 2.0** | Google login |
| **express-validator** | Input validation |
| **express-rate-limit** | Rate limiting |
| **Socket.io** | Real-time notifications |
| **node-cron** | Scheduled jobs |
| **Cloudinary** | Image/video upload |
| **Nodemailer** | Email sending (Mailtrap for dev) |
| **Multer** | File upload handling |
| **xss** | XSS sanitization |
| **Morgan** | HTTP request logging |

---

## Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- Cloudinary account
- Google Cloud account (for OAuth)
- Mailtrap account (for dev email)

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Mohammad-Alkreima/StayNest
cd staynest
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `MONGODB_URL` | MongoDB connection string |
| `JWT_SECRET_KEY` | Access token signing secret |
| `REFRESH_JWT_SECRET_KEY` | Refresh token signing secret |
| `CLOUD_NAME` | Cloudinary cloud name |
| `API_KEY_CLOUD` | Cloudinary API key |
| `API_SECRET_CLOUD` | Cloudinary API secret |
| `ADMIN_NAME` | Admin name (for seeding) |
| `ADMIN_PHONE` | Admin phone |
| `ADMIN_EMAIL` | Admin email |
| `ADMIN_PASSWORD` | Admin password |
| `PORT_MAIL` | SMTP port |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASSWORD` | SMTP password |
| `HOST` | SMTP host |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `FRONTEND_URL` | Frontend URL (for OAuth redirect) |

### 4. Run the server

**Development (with nodemon):**

```bash
npm run watch
```

**Production:**

```bash
npm start
```

### 5. Additional commands

```bash
# Create initial admin account
npm run seed:admin

# Apply MongoDB indexes and schema validation
npm run db:setup
```

---

## Project Structure

```
StayNest/
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Environment variable template
├── .gitignore
├── package.json                  # Project manifest & dependencies
├── RULES.md                      # Coding standards
├── system_design.md              # System design document
│
└── src/
    ├── app.js                    # Main entry point
    │
    ├── utils/                    # Utility modules
    │   ├── asyncHandler.js       # Async error wrapper
    │   ├── connectDB.js          # MongoDB connection
    │   ├── jwtService.js         # JWT token generation & verification
    │   ├── passwordService.js    # Argon2 password hashing
    │   ├── cookiesService.js     # httpOnly cookie management
    │   ├── refreshTokenService.js# Access token refresh logic
    │   ├── emailService.js       # Email sending (Nodemailer)
    │   ├── passport.js           # Google OAuth 2.0 strategy
    │   └── uploadToCloudinary.js # Cloudinary file upload
    │
    ├── models/                   # Mongoose data models
    │   ├── User.js               # User model
    │   ├── Property.js           # Property model
    │   ├── Booking.js            # Booking model
    │   ├── Review.js             # Review model
    │   └── Dispute.js            # Dispute model
    │
    ├── middlewares/              # Express middlewares
    │   ├── auth.js               # Required authentication
    │   ├── optionalAuth.js       # Optional authentication
    │   ├── role.js               # Role-based authorization
    │   ├── validate.js           # express-validator error handler
    │   ├── xss.js                # XSS input sanitization
    │   ├── limiter.js            # Rate limiting
    │   ├── errorHandler.js       # Global error handler
    │   ├── notFound.js           # 404 handler
    │   ├── id.js                 # MongoDB ObjectId validation
    │   ├── page.js               # Pagination defaults
    │   ├── multer.js             # File upload (Multer)
    │   └── checkBookingCompletion.js  # Review eligibility check
    │
    ├── controllers/              # Route handlers
    │   ├── auth.controller.js    # Authentication logic
    │   ├── upload.controller.js  # File upload logic
    │   ├── property.controller.js# Property management
    │   ├── booking.controller.js # Booking management
    │   ├── review.controller.js  # Review management
    │   └── dispute.controller.js # Dispute management
    │
    ├── routes/                   # API route definitions
    │   ├── auth.route.js         # Auth endpoints
    │   ├── uploads.route.js      # Upload endpoints
    │   ├── property.route.js     # Property endpoints
    │   ├── booking.route.js      # Booking endpoints
    │   ├── review.route.js       # Review endpoints
    │   └── dispute.route.js      # Dispute endpoints
    │
    ├── validators/               # Input validation chains
    │   ├── auth.validate.js      # Auth validation
    │   ├── bookingValidation.js  # Booking validation
    │   ├── propertyValidation.js # Property validation
    │   ├── review.validate.js    # Review validation
    │   └── dispute.validation.js # Dispute validation
    │
    ├── constants/                # Constants
    │   ├── loyaltyLevels.js      # Loyalty tiers & discounts
    │   └── bookingBlockPolicy.js # Booking block policy
    │
    ├── cron/                     # Cron jobs
    │   └── reviewCron.js         # Auto-show reviews after 14 days
    │
    ├── jobs/                     # Scheduled jobs
    │   ├── bookingCompletion.job.js   # Auto-complete bookings
    │   ├── bookingExpiration.job.js   # Expire pending bookings
    │   └── paymentRelease.job.js      # Release held payments
    │
    ├── services/                 # Business services
    │   ├── payment.service.js    # Escrow payment service
    │   └── bookingRestriction.service.js  # Booking restriction
    │
    └── script/                   # Scripts
        ├── createAdmin.js        # Seed initial admin
        └── setupDatabase.js      # Setup DB indexes/validation
```

---

## File Descriptions

### Root Files

| File | Description |
|------|-------------|
| `package.json` | Project manifest with scripts and dependencies |
| `.env` | Environment variables (not tracked by git) |
| `.env.example` | Template for environment variables |
| `.gitignore` | Git ignore rules |
| `RULES.md` | Coding conventions and patterns |
| `system_design.md` | System architecture and design |

### Entry Point

| File | Description |
|------|-------------|
| `src/app.js` | Express setup, middleware registration, route mounting, MongoDB connection, Socket.io initialization, cron job startup |

### Utils (`src/utils/`)

| File | Description |
|------|-------------|
| `asyncHandler.js` | Wraps async route handlers to catch errors and forward to Express error middleware |
| `connectDB.js` | Connects to MongoDB using the `MONGODB_URL` environment variable |
| `jwtService.js` | Generates and verifies JWT access tokens (1h) and refresh tokens (7d) |
| `passwordService.js` | Hashes passwords using Argon2id with configurable parameters |
| `cookiesService.js` | Sets, gets, and clears httpOnly cookies for access and refresh tokens |
| `refreshTokenService.js` | Reads refresh token from cookies, verifies, and issues new token pair |
| `emailService.js` | Sends emails via Nodemailer using SMTP configuration |
| `passport.js` | Configures Passport Google OAuth2 strategy for authentication |
| `uploadToCloudinary.js` | Uploads file buffers to Cloudinary and returns URLs |

### Models (`src/models/`)

| File | Description |
|------|-------------|
| `User.js` | User model with fields for auth, roles, OAuth, account locking, loyalty tracking |
| `Property.js` | Property model with GeoJSON location, pricing, amenities, verification |
| `Booking.js` | Booking model with pricing snapshots, status workflow, payment escrow, cancellation details |
| `Review.js` | Review model with mutual visibility system, reporting, and flagging |
| `Dispute.js` | Dispute model for conflict resolution between guests and hosts |

### Middlewares (`src/middlewares/`)

| File | Description |
|------|-------------|
| `auth.js` | Required authentication — checks access token, falls back to refresh, returns 401 on failure |
| `optionalAuth.js` | Optional authentication — tries to verify token silently, sets `req._user = null` on failure |
| `role.js` | Role-based access control — accepts array/string of allowed roles |
| `validate.js` | Processes express-validator results and returns structured error responses |
| `xss.js` | Sanitizes all incoming data (body, query, params) using the xss library |
| `limiter.js` | Rate limiting: general (100/15min) and login-specific (25/60min) |
| `errorHandler.js` | Global error handler for uncaught errors and multer-specific errors |
| `notFound.js` | 404 catch-all middleware |
| `id.js` | Validates MongoDB ObjectId in route parameters |
| `page.js` | Sets pagination defaults (`req._limit = 30`, `req._page` from query) |
| `multer.js` | Multer configuration for memory storage (images, max 8 files, 5MB each) |
| `checkBookingCompletion.js` | Verifies a booking is completed with end date passed before allowing a review |

### Controllers (`src/controllers/`)

| File | Description |
|------|-------------|
| `auth.controller.js` | Handles signup, login, logout, profile, update, delete, forgot/reset password, Google OAuth callback |
| `upload.controller.js` | Handles file upload to Cloudinary |
| `property.controller.js` | CRUD for properties, geo-search, text search, filtering, admin verification |
| `booking.controller.js` | Full booking lifecycle: create, read, update, cancel, confirm, pay, complete, reject + host earnings dashboard |
| `review.controller.js` | CRUD for reviews, dual-sided visibility system, reporting and admin handling |
| `dispute.controller.js` | Dispute creation, admin resolution, filtering, financial execution |

### Routes (`src/routes/`)

| File | Description |
|------|-------------|
| `auth.route.js` | 11 auth endpoints including Google OAuth |
| `uploads.route.js` | 1 file upload endpoint |
| `property.route.js` | 6 property endpoints |
| `booking.route.js` | 10 booking endpoints |
| `review.route.js` | 8 review endpoints |
| `dispute.route.js` | 6 dispute endpoints |

### Validators (`src/validators/`)

| File | Description |
|------|-------------|
| `auth.validate.js` | Validation for signup, login, edit operations |
| `bookingValidation.js` | Validation for booking CRUD and filters |
| `propertyValidation.js` | Validation for property CRUD and admin verification |
| `review.validate.js` | Validation for review creation, update, reporting |
| `dispute.validation.js` | Validation for dispute creation, update, resolution, filtering |

### Constants (`src/constants/`)

| File | Description |
|------|-------------|
| `loyaltyLevels.js` | Loyalty tiers: Platinum (20+, 15%), Gold (10+, 10%), Silver (5+, 5%), Regular (0, 0%) |
| `bookingBlockPolicy.js` | Evaluation period (30 days), warning threshold (3), block threshold (5), block duration (30 days) |

### Jobs & Cron (`src/cron/`, `src/jobs/`)

| File | Schedule | Description |
|------|----------|-------------|
| `reviewCron.js` | Daily at midnight | Shows reviews whose `visibleFrom` date has passed |
| `bookingCompletion.job.js` | Every hour | Auto-completes confirmed bookings past end date with held payment |
| `bookingExpiration.job.js` | Every hour | Marks pending bookings older than 24 hours as expired |
| `paymentRelease.job.js` | Every hour | Releases held payments for completed bookings past 24-hour dispute window |

### Services (`src/services/`)

| File | Description |
|------|-------------|
| `payment.service.js` | Escrow payment management: release, refund, partial refund, dispute resolution execution, batch eligible payment release |
| `bookingRestriction.service.js` | Evaluates guest booking restriction after confirmed cancellations, sends warnings and blocks |

### Scripts (`src/script/`)

| File | Description |
|------|-------------|
| `createAdmin.js` | Seeds the initial admin user from environment variables |
| `setupDatabase.js` | Applies MongoDB schema validation rules and unique indexes |

---

## Authentication System

### Flow

1. **Email/Password Login:** Email + password → JWT Access Token (1h) + Refresh Token (7d) in httpOnly cookies
2. **Google OAuth:** Redirect to Google → Callback → Create or link account → Generate tokens
3. **Auth Middleware:** Checks access token cookie → If expired, uses refresh token → If both fail → 401
4. **Optional Auth:** Like `auth` but doesn't return error on failure — sets `req._user = null`
5. **Security:** Argon2id for passwords, httpOnly cookies, rate limiting (25/hour on login)
6. **Account Lockout:** After 5 failed login attempts → 30-minute lock

### Auth Middleware Chain

```
Request → cookiesService.getAccessToken → valid? → req._user = decoded
                                          ↓ no
                               refreshTokenService → valid? → new tokens + req._user
                                                       ↓ no
                                              clear cookies → 401
```

---

## Real-Time Notifications (Socket.io)

StayNest uses **Socket.io** to deliver real-time notifications for key events throughout the booking lifecycle.

### Setup

The Socket.io server is initialized in `src/app.js` alongside the HTTP server:

```js
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.set("io", io);
app.set("onlineUsers", onlineUsers);
```

### Client Connection

On the frontend, connect and register the user's ID:

```js
const socket = io("http://localhost:3000");

// After login, register the user's ID to receive notifications
socket.emit("register", userId);

// Listen for booking events
socket.on("newBookingNotification", (data) => { ... });
socket.on("bookingConfirmedNotification", (data) => { ... });
socket.on("bookingCancelledNotification", (data) => { ... });
socket.on("bookingPaidNotification", (data) => { ... });
socket.on("bookingCompletedNotification", (data) => { ... });
socket.on("bookingRejectedNotification", (data) => { ... });
socket.on("bookingUpdatedNotification", (data) => { ... });

// Listen for review events
socket.on("newReviewNotification", (data) => { ... });
socket.on("reviewReportedNotification", (data) => { ... });
socket.on("reviewActionNotification", (data) => { ... });

// Listen for property events
socket.on("newPropertyNotification", (data) => { ... });
socket.on("propertyStatusChanged", (data) => { ... });
```

### Online Users Map

Connected users are tracked in a `Map<userId, socketId>` stored in `onlineUsers`. Controllers use this map to look up the recipient's socket ID and emit targeted notifications.

### Events Reference

| Event | Triggered When | Recipient | Payload |
|-------|---------------|-----------|---------|
| `newBookingNotification` | A guest creates a new booking | Host | `{ message, bookingId }` |
| `bookingUpdatedNotification` | Guest updates booking dates | Host | `{ message, bookingId }` |
| `bookingCancelledNotification` | Guest or admin cancels a booking | Other party | `{ message, bookingId, refundAmount? }` |
| `bookingConfirmedNotification` | Host or admin confirms a booking | Guest | `{ message, bookingId }` |
| `bookingPaidNotification` | Guest pays for confirmed booking | Host | `{ message, bookingId }` |
| `bookingCompletedNotification` | Host or admin completes booking | Guest | `{ message, bookingId }` |
| `bookingRejectedNotification` | Host or admin rejects a booking | Guest | `{ message, bookingId, reason? }` |
| `newReviewNotification` | A review is submitted | Other party (guest/host) | `{ message, bookingId }` |
| `reviewReportedNotification` | A review is reported | Admin | `{ message, reviewId }` |
| `reviewActionNotification` | Admin handles a report (delete/dismiss) | Review owner | `{ message, reviewId, action }` |
| `newPropertyNotification` | A host creates a new property | Admin | `{ message, propertyId }` |
| `propertyStatusChanged` | Admin approves/rejects a property | Host | `{ message, propertyId, status }` |

### Architecture

```
Client (Frontend)                    Server (Backend)
      │                                    │
      │──── socket.emit("register", id) ───→│  Map userId → socketId
      │                                    │
      │←── io.to(socketId).emit(event) ─────│  Controllers dispatch events
      │                                    │
      │       (targeted notifications)      │
```

Controllers access the `io` and `onlineUsers` instances via `req.app.get("io")` and `req.app.get("onlineUsers")`.

---

## API Documentation

All routes are prefixed with: `/api/v1`

### Health Check

```
GET /api/health
Response 200: "API is Healthy"
```

---

### Auth `/api/v1/auth`

#### `POST /signup`
Register a new user.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | |
| `email` | string | yes | Unique, lowercase, validated |
| `password` | string | yes | Strong: min 8, 1 uppercase, 1 lowercase, 1 number, 1 symbol |
| `role` | string | no | `guest` or `host` — default: `guest` |
| `phone` | string | no | Valid mobile phone |
| `profileImage` | string | no | URL |

**Response 201:**
```json
{
  "message": "Created User Successfully",
  "user": { "name", "email", "role", ... }
}
```

---

#### `POST /login`
Authenticate and receive JWT tokens.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |

**Response 201:** Sets `accessToken` and `refreshToken` as httpOnly cookies.
```json
{
  "message": "Logged In Successfully",
  "user": { "name", "role" }
}
```

---

#### `POST /logout`
Clear authentication cookies.
- **Auth required**

**Response 201:**
```json
{ "message": "Logged Out Successfully" }
```

---

#### `GET /profile`
Get current user's profile.
- **Auth required**

**Response 200:** User data without `password`

---

#### `PUT /edit/:id`
Update user profile (name, phone, profile image).
- **Auth required** — only the account owner can edit

| Field | Type | Required |
|-------|------|----------|
| `name` | string | no |
| `phone` | string | no |
| `profileImage` | string | no |

---

#### `DELETE /delete/:id`
Soft-delete user account.
- **Auth required** — admin cannot delete themselves

---

#### `POST /forgotpassword`
Send password reset token to email.

| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |

---

#### `POST /resetpassword`
Reset password with token.

| Field | Type | Required |
|-------|------|----------|
| `token` | string | yes |
| `newPassword` | string | yes |

---

#### `GET /google`
Initiate Google OAuth login — redirects to Google consent screen.

#### `GET /google/callback`
Google OAuth callback — generates tokens and redirects to frontend.

---

### Properties `/api/v1/properties`

#### `GET /`
Get all properties with filtering and search.

| Query param | Type | Description |
|-------------|------|-------------|
| `lng`, `lat` | number | Coordinates for geo-near search |
| `distance` | number | Search radius in meters |
| `search` | string | Text search on title and location address |
| `minPrice`, `maxPrice` | number | Price range filter |
| `maxGuests` | number | Maximum guests filter |
| `amenities` | string | Comma-separated amenities (`$all` match) |
| `sort` | string | `price_asc`, `price_desc`, `newest` |
| `page`, `limit` | number | Pagination |

---

#### `GET /:id`
Get a single property by ID.

---

#### `POST /`
Create a new property.
- **Auth required** — role `host`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | 5-100 characters |
| `description` | string | no | |
| `location.address` | string | yes | |
| `location.coordinates` | [number, number] | yes | [lng, lat] |
| `pricePerNight` | number | yes | > 0 |
| `cleaningFee` | number | no | >= 0 |
| `serviceFee` | number | no | >= 0 |
| `maxGuests` | number | yes | >= 1 |
| `images` | string[] | no | URLs |
| `amenities` | string[] | no | |
| `verificationDocuments` | string | yes | URL |

---

#### `POST /verfiyProperty`
Approve or reject a property — admin only.
- **Auth required** — role `admin`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `propertyId` | string | yes | |
| `status` | string | yes | `approved` or `rejected` |
| `rejectionReason` | string | no | |

---

#### `PUT /:id`
Update property — owner only.
- **Auth required** — role `host`

Updating critical fields (documents, title, location, price) resets verification status and notifies admin.

---

#### `DELETE /:id`
Soft-delete property.
- **Auth required** — role `host` or `admin`

---

### Bookings `/api/v1/bookings`

#### `POST /`
Create a new booking.
- **Auth required** — role `guest`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `propertyId` | string | yes | |
| `startDate` | string | yes | ISO 8601, not in the past |
| `endDate` | string | yes | Must be after startDate |

On creation:
- Loyalty discount calculated based on guest's totalBookings
- Pricing snapshot stored (price per night, fees, subtotal, discount, total)
- Platform commission (10%) and host earnings calculated
- Booking status: `pending`
- Real-time notification sent to host via Socket.io

---

#### `GET /`
Get bookings (role-based filtering).
- **Auth required**

| Query | Description |
|-------|-------------|
| `status` | pending / confirmed / completed / cancelled / expired |
| `paymentStatus` | unpaid / held / released / refunded |
| `type` | upcoming / ongoing / past |
| `sort` | newest / oldest / checkIn / price |
| `page`, `limit` | Pagination |

Guest sees their own bookings, host sees received bookings, admin sees all.

---

#### `GET /host/earnings`
Host earnings dashboard.
- **Auth required** — role `host`

**Response:**
```json
{
  "totalBookings": 10,
  "totalRevenue": 5000,
  "totalCommission": 500,
  "totalEarnings": 4500,
  "monthly": [
    { "month": "2026-07", "bookings": 3, "revenue": 1500, "earnings": 1350 }
  ]
}
```

---

#### `GET /:id`
Get a single booking by ID.

---

#### `PATCH /:id`
Update booking dates — guest only, `pending` status only.
- **Auth required** — role `guest`

---

#### `PATCH /:id/cancel`
Cancel a booking.
- **Auth required** — role `guest` or `admin`

Refund policy:
- >= 7 days before check-in: 100% refund
- >= 2 days before check-in: 50% refund
- < 2 days: no refund

Evaluates guest booking restriction (blocks after 5 confirmed cancellations in 30 days).

---

#### `PATCH /:id/confirm`
Confirm a booking — host or admin.
- **Auth required** — role `host` or `admin`

---

#### `PATCH /:id/pay`
Pay for a booking — guest.
- **Auth required** — role `guest`

Payment status set to `held` (escrow) until booking completion.

---

#### `PATCH /:id/complete`
Complete a booking (after check-out).
- **Auth required** — role `host` or `admin`

Increments guest's `totalBookings`.

---

#### `PATCH /:id/reject`
Reject a booking — host or admin.
- **Auth required** — role `host` or `admin`

---

### Reviews `/api/v1/reviews`

#### `GET /all`
Get all reviews with pagination.
- Non-admin sees only `isVisible: true`

---

#### `GET /allproperties`
Get all properties with their average rating and reviews.

---

#### `GET /:id`
Get a single review by ID.

---

#### `GET /property/:id`
Get reviews for a specific property with average rating.

---

#### `POST /`
Create a review.
- **Auth required** — role `host` or `guest`
- Booking must be completed (checked by `checkBookingCompletion` middleware)

| Field | Type | Description |
|-------|------|-------------|
| `bookingId` | string | |
| `rating` | number | 1-5 |
| `comment` | string | optional |
| `reviewerRole` | string | `guestToHost` or `hostToGuest` |

Mutual visibility system:
- If both parties review → both become visible immediately
- If only one party reviews → becomes visible after 14 days (`visibleFrom`)

---

#### `POST /:id/report`
Report a review.
- **Auth required** — role `host` or `guest`

---

#### `POST /:id/handle-report`
Admin handles a review report.
- **Auth required** — role `admin`

| Field | Type | Description |
|-------|------|-------------|
| `reportId` | string | |
| `action` | string | `delete` or `dismiss` |

---

#### `PUT /:id`
Update review — only if not yet visible.

---

### Disputes `/api/v1/disputes`

#### `POST /`
Create a dispute.
- **Auth required** — role `host` or `guest`
- Booking must be `completed` with `held` payment
- Must be within 24 hours of completion

| Field | Type | Description |
|-------|------|-------------|
| `bookingId` | string | |
| `reason` | string | 10-500 characters |

---

#### `GET /`
Get all disputes — admin only.

---

#### `GET /filter`
Filter disputes — admin only.

| Query | Description |
|-------|-------------|
| `name` | Search by user name |
| `type` | `host` or `guest` |
| `status` | open / in-progress / resolved |

---

#### `GET /:disputeId`
Get dispute by ID — admin only.

---

#### `PATCH /updateDispute/:id`
Update dispute reason (only if `open`).
- **Auth required** — reporter only

---

#### `PATCH /:id/resolve`
Resolve a dispute — admin.

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `resolved` |
| `winner` | string | `guest` or `host` |
| `resolutionType` | string | `fullRefund` / `partialRefund` / `releasePayment` / `noRefund` |
| `refundPercentage` | number | 0-100 |
| `refundAmount` | number | |
| `adminNotes` | string | max 1000 characters |

---

### Uploads `/api/v1/uploads`

#### `POST /external`
Upload files to Cloudinary.
- Multer config: max 8 files, 5MB each, formats: JPEG/JPG/PNG/WebP

---

## Database Models

### User
| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Required |
| `email` | String | Unique, lowercase |
| `password` | String | Argon2 hashed |
| `role` | String | `guest` / `host` / `admin` — default: `guest` |
| `phone` | String | |
| `profileImage` | String | |
| `totalBookings` | Number | default: 0 |
| `isDeleted` | Boolean | Soft delete flag |
| `googleId` | String | Google OAuth link |
| `isOAuthUser` | Boolean | |
| `blocked` | Boolean | Account lock |
| `failedLoginAttempts` | Number | Failed login counter |
| `lockedUntil` | Date | Lock expiration |
| `passwordResetToken` | String | |
| `passwordResetExpires` | Date | |

### Property
| Field | Type | Description |
|-------|------|-------------|
| `hostId` | ref User | Owner |
| `title` | String | |
| `description` | String | |
| `location` | GeoJSON | `{ type: "Point", coordinates: [lng, lat], address: String }` |
| `pricePerNight` | Number | |
| `cleaningFee` | Number | default: 0 |
| `serviceFee` | Number | default: 0 |
| `maxGuests` | Number | |
| `images` | [String] | |
| `amenities` | [String] | |
| `status` | String | available / unavailable / maintenance / suspended |
| `isDeleted` | Boolean | |
| `isVerified` | Boolean | default: false |
| `statusVerified` | String | approved / rejected |
| `verificationDocuments` | String | |

### Booking
| Field | Type | Description |
|-------|------|-------------|
| `propertyId` | ref Property | |
| `hostId` | ref User | |
| `guestId` | ref User | |
| `startDate` | Date | |
| `endDate` | Date | |
| `numberOfNights` | Number | |
| `pricingSnapshot` | Object | Contains pricePerNight, cleaningFee, serviceFee, subtotal, discountPercentage, discountAmount, totalPrice |
| `status` | String | pending / confirmed / rejected / expired / cancelled / completed |
| `payment` | Object | Contains status (unpaid/held/released/refunded), method, amount, commission, earning |
| `cancellation` | Object | Contains reason, cancelledBy, cancelledByRole, cancelledAt |

### Review
| Field | Type | Description |
|-------|------|-------------|
| `bookingId` | ref Booking | |
| `reviewerId` | ref User | |
| `rating` | Number | 1-5 |
| `comment` | String | |
| `isVisible` | Boolean | default: false |
| `visibleFrom` | Date | Becomes visible after this date |
| `reviewerRole` | String | guestToHost / hostToGuest |
| `reports` | [subdoc] | Array of reports with reportedBy, reason, status |
| `isFlagged` | Boolean | |

### Dispute
| Field | Type | Description |
|-------|------|-------------|
| `bookingId` | ref Booking | |
| `reporterId` | ref User | |
| `targetId` | ref User | |
| `type` | String | host-to-guest / guest-to-host |
| `reason` | String | |
| `winner` | String | guest / host / null |
| `resolutionType` | String | fullRefund / partialRefund / releasePayment / noRefund |
| `refundPercentage` | Number | |
| `refundAmount` | Number | |
| `status` | String | open / in-progress / resolved |
| `adminNotes` | String | |

---

## Key Features

### 1. Authentication & Security
- Email/password + Google OAuth 2.0
- JWT access (1h) + refresh (7d) tokens in httpOnly cookies
- Argon2id password hashing
- XSS input sanitization
- Rate limiting (general + login-specific)
- Account lockout after 5 failed attempts

### 2. Properties
- Geo-near search (2dsphere index)
- Full-text search on title and address
- Filtering by price, guests, amenities
- Admin verification workflow
- Soft delete with safety checks

### 3. Bookings
- Date conflict prevention (compound unique index)
- Pricing snapshot stored on creation
- Loyalty discount: Platinum 15%, Gold 10%, Silver 5%
- Platform commission: 10%
- Multi-status workflow: pending → confirmed/rejected → paid (held) → completed
- Modification and cancellation with time-based refund policy
- Guest restriction after 5 confirmed cancellations (30-day block)

### 4. Reviews
- Dual-sided review system (guest→host, host→guest)
- Conditional visibility: both review → immediate; one reviews → 14-day wait
- Review reporting and admin moderation
- Edit only before visibility

### 5. Payment Escrow
- Payment held on booking
- Auto-release 24 hours after completion
- Full/partial refund based on cancellation policy
- Financial execution for dispute resolution

### 6. Disputes
- Create within 24 hours of completion
- Admin resolution with financial outcome
- Supports full refund, partial refund, payment release, no refund

### 7. Scheduled Jobs (Cron)
| Job | Interval | Action |
|-----|----------|--------|
| Booking completion | Every hour | Auto-completes confirmed bookings past end date |
| Booking expiration | Every hour | Expires pending bookings older than 24h |
| Payment release | Every hour | Releases held payments for completed bookings past 24h window |
| Review visibility | Daily midnight | Shows reviews whose visibleFrom date has passed |

### 8. Real-time Notifications (Socket.io)
- Host notified on new booking
- Guest notified on booking confirm/reject/cancel
- Both parties notified on review submission
- Host notified on property verify/reject
- Parties notified on dispute resolution

### 9. Loyalty Program
| Tier | Completed Bookings | Discount |
|------|-------------------|----------|
| Regular | 0+ | 0% |
| Silver | 5+ | 5% |
| Gold | 10+ | 10% |
| Platinum | 20+ | 15% |

---

## Common Errors & Solutions

### `{"success":false,"message":"Document failed validation"}`
**Cause:** Mongoose 9 no longer supports `next()` in pre-save hooks. The current code uses `async function(next)` where `next` is `undefined`.
**Solution:** Change pre-save hook to `async function()` and use `throw new Error(...)` instead of `return next(new Error(...))`.

### `Invalid ID`
**Cause:** Route ordering issue — a parameterized route `/:id` is placed before a specific route like `/allproperties`.
**Solution:** Place specific routes before parameterized routes in the route definition file.

### `Cannot set headers after they are sent`
**Cause:** Multiple `res.json()` or `res.status().json()` calls in the same request handler.
**Solution:** Add `return` before every `res.json()` call to prevent double responses.

### `E11000 duplicate key error`
**Cause:** Attempting to create a document with a duplicate email (unique index).
**Solution:** Check if user already exists before attempting creation (already handled in Google OAuth strategy).

---

## Coding Standards

Refer to `RULES.md` for detailed conventions on:
- File naming (kebab-case)
- Variable/function naming (camelCase)
- Controller structure
- Route definition patterns
- Model and validator patterns

---

## Documentation
- [Postman Documentation](https://documenter.getpostman.com/view/49267230/2sBY4Mt1BW)
