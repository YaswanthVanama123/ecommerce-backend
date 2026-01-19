// Database Index Creation and Optimization Script
// Run this script to ensure all indexes are created for optimal query performance

const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('./models/User').default;
const Product = require('./models/Product').default;
const Order = require('./models/Order').default;
const Category = require('./models/Category').default;
const Cart = require('./models/Cart').default;
const Wishlist = require('./models/Wishlist').default;
const Review = require('./models/Review').default;
const Notification = require('./models/Notification').default;
const Payment = require('./models/Payment').default;
const Shipping = require('./models/Shipping').default;
const Return = require('./models/Return').default;

// ========================================
// Index Definitions
// ========================================

const indexDefinitions = {
  User: [
    { fields: { email: 1 }, options: { unique: true, name: 'email_unique_idx' } },
    { fields: { role: 1, isActive: 1 }, options: { name: 'role_active_idx' } },
    { fields: { isActive: 1, createdAt: -1 }, options: { name: 'active_created_idx' } },
    { fields: { phone: 1 }, options: { sparse: true, name: 'phone_idx' } }
  ],

  Product: [
    // Text search index
    { fields: { name: 'text', brand: 'text', tags: 'text' }, options: { name: 'text_search_idx' } },
    // Category and filtering
    { fields: { category: 1, price: 1, isActive: 1 }, options: { name: 'category_price_active_idx' } },
    { fields: { isFeatured: 1, isActive: 1, 'ratings.average': -1 }, options: { name: 'featured_active_rating_idx' } },
    { fields: { isActive: 1, createdAt: -1 }, options: { name: 'active_created_idx' } },
    { fields: { brand: 1, price: 1, isActive: 1 }, options: { name: 'brand_price_active_idx' } },
    // Stock management
    { fields: { 'stock.quantity': 1, isActive: 1 }, options: { name: 'stock_active_idx' } },
    // Price range queries
    { fields: { price: 1, discountPrice: 1 }, options: { name: 'price_discount_idx' } }
  ],

  Order: [
    // Core indexes
    { fields: { orderNumber: 1 }, options: { unique: true, name: 'order_number_idx' } },
    { fields: { user: 1, orderStatus: 1, createdAt: -1 }, options: { name: 'user_status_created_idx' } },
    { fields: { orderStatus: 1, paymentStatus: 1 }, options: { name: 'status_payment_idx' } },
    { fields: { paymentStatus: 1, createdAt: -1 }, options: { name: 'payment_created_idx' } },
    { fields: { createdAt: -1 }, options: { name: 'created_idx' } },
    { fields: { orderStatus: 1, deliveredAt: 1 }, options: { name: 'status_delivered_idx' } },
    // Shipping indexes
    { fields: { shippingStatus: 1, createdAt: -1 }, options: { name: 'shipping_status_created_idx' } },
    { fields: { trackingNumber: 1 }, options: { sparse: true, name: 'tracking_number_idx' } },
    { fields: { user: 1, shippingStatus: 1 }, options: { name: 'user_shipping_status_idx' } },
    // Payment method filtering
    { fields: { paymentMethod: 1, createdAt: -1 }, options: { name: 'payment_method_created_idx' } },
    // Amount range queries
    { fields: { totalAmount: 1, createdAt: -1 }, options: { name: 'total_amount_created_idx' } }
  ],

  Category: [
    { fields: { name: 1 }, options: { unique: true, name: 'category_name_idx' } },
    { fields: { isActive: 1 }, options: { name: 'active_idx' } }
  ],

  Cart: [
    { fields: { user: 1 }, options: { unique: true, name: 'user_cart_idx' } },
    { fields: { 'items.product': 1 }, options: { name: 'cart_product_idx' } },
    { fields: { updatedAt: -1 }, options: { name: 'updated_idx' } }
  ],

  Wishlist: [
    { fields: { user: 1 }, options: { unique: true, name: 'user_wishlist_idx' } },
    { fields: { products: 1 }, options: { name: 'products_idx' } }
  ],

  Review: [
    { fields: { product: 1, createdAt: -1 }, options: { name: 'product_created_idx' } },
    { fields: { user: 1, product: 1 }, options: { unique: true, name: 'user_product_unique_idx' } },
    { fields: { rating: 1 }, options: { name: 'rating_idx' } },
    { fields: { isVerifiedPurchase: 1 }, options: { name: 'verified_idx' } }
  ],

  Notification: [
    { fields: { user: 1, read: 1, createdAt: -1 }, options: { name: 'user_read_created_idx' } },
    { fields: { type: 1, createdAt: -1 }, options: { name: 'type_created_idx' } },
    { fields: { read: 1, createdAt: -1 }, options: { name: 'read_created_idx' } }
  ],

  Payment: [
    { fields: { orderId: 1 }, options: { name: 'order_id_idx' } },
    { fields: { userId: 1, createdAt: -1 }, options: { name: 'user_created_idx' } },
    { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created_idx' } },
    { fields: { paymentMethod: 1 }, options: { name: 'method_idx' } },
    { fields: { transactionId: 1 }, options: { sparse: true, unique: true, name: 'transaction_id_idx' } }
  ],

  Shipping: [
    { fields: { orderId: 1 }, options: { unique: true, name: 'order_id_idx' } },
    { fields: { trackingNumber: 1 }, options: { unique: true, sparse: true, name: 'tracking_number_idx' } },
    { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created_idx' } },
    { fields: { carrier: 1, status: 1 }, options: { name: 'carrier_status_idx' } }
  ],

  Return: [
    { fields: { orderId: 1 }, options: { name: 'order_id_idx' } },
    { fields: { userId: 1, status: 1, createdAt: -1 }, options: { name: 'user_status_created_idx' } },
    { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created_idx' } },
    { fields: { returnNumber: 1 }, options: { unique: true, name: 'return_number_idx' } }
  ]
};

// ========================================
// Index Creation Functions
// ========================================

async function createIndexes(model, modelName) {
  console.log(`\n📊 Creating indexes for ${modelName}...`);

  const indexes = indexDefinitions[modelName];
  if (!indexes || indexes.length === 0) {
    console.log(`⚠️  No custom indexes defined for ${modelName}`);
    return;
  }

  let created = 0;
  let failed = 0;

  for (const { fields, options } of indexes) {
    try {
      await model.collection.createIndex(fields, options);
      console.log(`✅ Created index: ${options.name}`);
      created++;
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        // Index already exists or name conflict
        console.log(`ℹ️  Index already exists: ${options.name}`);
      } else {
        console.error(`❌ Failed to create index ${options.name}:`, error.message);
        failed++;
      }
    }
  }

  console.log(`\n${modelName} Summary: ${created} created, ${failed} failed`);
}

async function dropAllIndexes(model, modelName) {
  console.log(`\n🗑️  Dropping all indexes for ${modelName}...`);

  try {
    const indexes = await model.collection.indexes();
    console.log(`Found ${indexes.length} indexes`);

    for (const index of indexes) {
      // Don't drop the _id index
      if (index.name === '_id_') continue;

      try {
        await model.collection.dropIndex(index.name);
        console.log(`✅ Dropped index: ${index.name}`);
      } catch (error) {
        console.error(`❌ Failed to drop index ${index.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`Error dropping indexes for ${modelName}:`, error.message);
  }
}

async function listIndexes(model, modelName) {
  console.log(`\n📋 Listing indexes for ${modelName}...`);

  try {
    const indexes = await model.collection.indexes();

    console.log(`Found ${indexes.length} indexes:\n`);

    for (const index of indexes) {
      const keys = Object.entries(index.key)
        .map(([field, order]) => `${field}: ${order}`)
        .join(', ');

      console.log(`  ${index.name}:`);
      console.log(`    Keys: { ${keys} }`);
      if (index.unique) console.log(`    Unique: true`);
      if (index.sparse) console.log(`    Sparse: true`);
      if (index.expireAfterSeconds) console.log(`    TTL: ${index.expireAfterSeconds}s`);
      console.log('');
    }
  } catch (error) {
    console.error(`Error listing indexes for ${modelName}:`, error.message);
  }
}

async function analyzeIndexUsage(model, modelName) {
  console.log(`\n📊 Analyzing index usage for ${modelName}...`);

  try {
    const stats = await model.collection.stats();

    console.log(`Collection Stats:`);
    console.log(`  Documents: ${stats.count}`);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Indexes: ${stats.nindexes}`);
    console.log(`  Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    // Show index details
    const indexes = await model.collection.indexes();
    console.log(`\nIndex Details:`);

    for (const index of indexes) {
      console.log(`  ${index.name}: ${JSON.stringify(index.key)}`);
    }
  } catch (error) {
    console.error(`Error analyzing ${modelName}:`, error.message);
  }
}

// ========================================
// Main Execution
// ========================================

async function optimizeDatabase(options = {}) {
  const {
    drop = false,
    list = false,
    analyze = false,
    create = true
  } = options;

  try {
    console.log('🚀 Starting database optimization...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    const models = {
      User,
      Product,
      Order,
      Category,
      Cart,
      Wishlist,
      Review,
      Notification,
      Payment,
      Shipping,
      Return
    };

    // Process each model
    for (const [modelName, model] of Object.entries(models)) {
      if (drop) {
        await dropAllIndexes(model, modelName);
      }

      if (create) {
        await createIndexes(model, modelName);
      }

      if (list) {
        await listIndexes(model, modelName);
      }

      if (analyze) {
        await analyzeIndexUsage(model, modelName);
      }
    }

    console.log('\n✅ Database optimization completed!\n');
  } catch (error) {
    console.error('❌ Error optimizing database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// ========================================
// CLI Interface
// ========================================

const args = process.argv.slice(2);
const options = {
  drop: args.includes('--drop'),
  list: args.includes('--list'),
  analyze: args.includes('--analyze'),
  create: !args.includes('--no-create')
};

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Index Optimization Script

Usage:
  node scripts/optimizeDatabase.js [options]

Options:
  --drop       Drop all existing indexes before creating new ones
  --list       List all existing indexes
  --analyze    Analyze collection and index statistics
  --no-create  Skip index creation (useful with --list or --analyze)
  --help, -h   Show this help message

Examples:
  # Create all indexes
  node scripts/optimizeDatabase.js

  # List existing indexes
  node scripts/optimizeDatabase.js --list --no-create

  # Recreate all indexes
  node scripts/optimizeDatabase.js --drop

  # Analyze database
  node scripts/optimizeDatabase.js --analyze --no-create
  `);
  process.exit(0);
}

// Run optimization
if (require.main === module) {
  optimizeDatabase(options).catch(console.error);
}

module.exports = { optimizeDatabase, createIndexes, listIndexes, analyzeIndexUsage };
