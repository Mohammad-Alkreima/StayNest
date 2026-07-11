const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const mongoURI = process.env.MONGODB_URL;

// 1. تعريف قواعد التحقق لكل Collection
const schemasValidationRules = {
    users: {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["name", "email", "password", "role"],
                properties: {
                    name: { bsonType: "string" },
                    email: { bsonType: "string", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
                    password: { bsonType: "string", pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$|^\\$argon2.*$" },
                    role: { enum: ["guest", "host", "admin"] }
                }
            }
        },
        uniqueIndexes: [{ email: 1 }]
    },
    properties: {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["title", "price", "location"],
                properties: {
                    title: { bsonType: "string" },
                    price: { bsonType: "number", minimum: 0 },
                    location: { bsonType: "string" }
                }
            }
        },
        uniqueIndexes: []
    },
    reviews: {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["bookingId", "guestId", "hostId", "rating"],
                properties: {
                    bookingId: { bsonType: "objectId" },
                    guestId: { bsonType: "objectId" },
                    hostId: { bsonType: "objectId" },
                    rating: { bsonType: "number" }
                }
            }
        },
        uniqueIndexes: []
    },
    bookings: {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["propertyId", "guestId", "startDate", "endDate"],
                properties: {
                    startDate: { bsonType: "date" },
                    endDate: { bsonType: "date" }
                }
            }
        },
        uniqueIndexes: []
    },
    disputs: {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["bookingId", "reporterId", "reason"],
                properties: {
                    bookingId: { bsonType: "objectId" },
                    reporterId: { bsonType: "objectId" },
                    reason: { bsonType: "string"}
                }
            }
        },
        uniqueIndexes: []
    }
};

async function setupDatabase() {
    try {
        await mongoose.connect(mongoURI);
        console.log("✓ Connected to MongoDB.");

        const db = mongoose.connection.db;

        for (const [collectionName, config] of Object.entries(schemasValidationRules)) {
            // 1. إنشاء الـ Collection إذا لم تكن موجودة
            await db.createCollection(collectionName).catch(() => {});
            
            // 2. تطبيق الـ Validator 
            // تأكدنا الآن أن config.validator موجود
            await db.command({
                collMod: collectionName,
                validator: config.validator,
                validationLevel: "strict",
                validationAction: "error"
            });
            console.log(`✓ Rules applied to: "${collectionName}"`);

            // 3. إنشاء الـ Indexes إذا وجدت
            if (config.uniqueIndexes && config.uniqueIndexes.length > 0) {
                for (const index of config.uniqueIndexes) {
                    await db.collection(collectionName).createIndex(index, { unique: true }).catch(() => {});
                    console.log(`  - Index applied to ${collectionName}`);
                }
            }
        }

        console.log("✓ Database setup completed successfully.");
    } catch (error) {
        console.error("✗ Setup failed:", error.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

setupDatabase();