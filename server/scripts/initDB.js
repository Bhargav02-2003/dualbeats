/**
 * DualBeats — MongoDB Atlas Collection & Index Initializer
 * Run: node scripts/initDB.js
 *
 * Creates all required collections with proper indexes:
 *   - users     → unique email, index on isVerified
 *   - otps      → TTL auto-expiry (10 min), index on email
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

async function initDB() {
  console.log('\n🔧 DualBeats — Database Initializer');
  console.log('=====================================');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = mongoose.connection.db;

    // ─── 1. USERS Collection ───────────────────────────────────────
    console.log('📋 Setting up [users] collection...');

    const usersExists = await db.listCollections({ name: 'users' }).toArray();
    if (usersExists.length === 0) {
      await db.createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'email', 'password'],
            properties: {
              name: {
                bsonType: 'string',
                minLength: 2,
                maxLength: 50,
                description: 'User full name — required, 2-50 chars',
              },
              email: {
                bsonType: 'string',
                description: 'User email — required, unique',
              },
              password: {
                bsonType: 'string',
                description: 'Bcrypt hashed password — required',
              },
              isVerified: {
                bsonType: 'bool',
                description: 'Email verification status',
              },
              createdAt: {
                bsonType: 'date',
              },
              updatedAt: {
                bsonType: 'date',
              },
            },
          },
        },
        validationLevel: 'moderate',
        validationAction: 'warn',
      });
      console.log('  ✔ Created [users] collection');
    } else {
      console.log('  ℹ [users] collection already exists');
    }

    // Users indexes
    const usersCol = db.collection('users');
    await usersCol.createIndex({ email: 1 }, { unique: true, name: 'idx_users_email_unique' });
    console.log('  ✔ Index: email (unique)');

    await usersCol.createIndex({ isVerified: 1 }, { name: 'idx_users_isVerified' });
    console.log('  ✔ Index: isVerified');

    await usersCol.createIndex({ createdAt: -1 }, { name: 'idx_users_createdAt' });
    console.log('  ✔ Index: createdAt (desc)');

    // ─── 2. OTPS Collection ────────────────────────────────────────
    console.log('\n📋 Setting up [otps] collection...');

    const otpsExists = await db.listCollections({ name: 'otps' }).toArray();
    if (otpsExists.length === 0) {
      await db.createCollection('otps', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['email', 'otp', 'expiresAt'],
            properties: {
              email: {
                bsonType: 'string',
                description: 'Email address — required',
              },
              otp: {
                bsonType: 'string',
                description: 'Bcrypt hashed OTP — required',
              },
              expiresAt: {
                bsonType: 'date',
                description: 'OTP expiry timestamp — required',
              },
              createdAt: {
                bsonType: 'date',
              },
              pendingUser: {
                bsonType: 'object',
                description: 'Temp user data awaiting verification',
                properties: {
                  name: { bsonType: 'string' },
                  password: { bsonType: 'string' },
                },
              },
            },
          },
        },
        validationLevel: 'moderate',
        validationAction: 'warn',
      });
      console.log('  ✔ Created [otps] collection');
    } else {
      console.log('  ℹ [otps] collection already exists');
    }

    // OTPs indexes
    const otpsCol = db.collection('otps');

    // TTL index — MongoDB auto-deletes documents 10 min after createdAt
    await otpsCol.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 600, name: 'idx_otps_ttl_expiry' }
    );
    console.log('  ✔ Index: createdAt (TTL — auto-delete after 10 min)');

    await otpsCol.createIndex({ email: 1 }, { name: 'idx_otps_email' });
    console.log('  ✔ Index: email');

    await otpsCol.createIndex({ expiresAt: 1 }, { name: 'idx_otps_expiresAt' });
    console.log('  ✔ Index: expiresAt');

    // ─── Summary ──────────────────────────────────────────────────
    console.log('\n=====================================');
    console.log('📊 Database Summary:');

    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      const indexes = await db.collection(col.name).indexes();
      console.log(`\n  📁 ${col.name}`);
      console.log(`     Documents : ${count}`);
      console.log(`     Indexes   : ${indexes.map(i => i.name).join(', ')}`);
    }

    console.log('\n✅ All collections and indexes initialized successfully!');
    console.log('🚀 DualBeats database is ready.\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.code === 11000) {
      console.error('   Duplicate key — index already exists (this is OK).');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

initDB();
