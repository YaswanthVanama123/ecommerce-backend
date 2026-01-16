import mongoose from 'mongoose';

// Optimal MongoDB connection options
const connectionOptions = {
  // Connection Pool Settings
  maxPoolSize: 50,                    // Maximum number of connections in the pool
  minPoolSize: 10,                    // Minimum number of connections in the pool
  maxIdleTimeMS: 30000,               // Close idle connections after 30 seconds

  // Timeout Settings
  serverSelectionTimeoutMS: 5000,     // Timeout for selecting a server (5 seconds)
  socketTimeoutMS: 45000,             // Timeout for socket operations (45 seconds)
  connectTimeoutMS: 10000,            // Timeout for initial connection (10 seconds)

  // Performance Optimization
  autoIndex: process.env.NODE_ENV !== 'production', // Disable auto-indexing in production
  autoCreate: true,                   // Auto-create collections

  // Write Concern
  w: 'majority',                      // Wait for majority of nodes to acknowledge writes
  wtimeoutMS: 5000,                   // Timeout for write operations

  // Read Preference
  readPreference: 'primaryPreferred', // Read from primary, fallback to secondary

  // Monitoring and Logging
  family: 4,                          // Use IPv4
  directConnection: false,            // Allow replica set connections
};

// Retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

// Connection state tracking
let isConnected = false;
let connectionAttempts = 0;

/**
 * Delay helper for retry logic
 * @param {number} ms - Milliseconds to delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect to MongoDB with retry logic
 * @param {number} retryCount - Current retry attempt
 */
const connectWithRetry = async (retryCount = 0) => {
  try {
    console.log(`[MongoDB] Attempting to connect... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);

    const conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);

    isConnected = true;
    connectionAttempts = retryCount + 1;

    console.log(`[MongoDB] Successfully connected to: ${conn.connection.host}`);
    console.log(`[MongoDB] Database: ${conn.connection.name}`);
    console.log(`[MongoDB] Connection attempts: ${connectionAttempts}`);

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection attempt ${retryCount + 1} failed:`, error.message);

    if (retryCount < MAX_RETRIES - 1) {
      console.log(`[MongoDB] Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await delay(RETRY_DELAY);
      return connectWithRetry(retryCount + 1);
    } else {
      console.error('[MongoDB] Max retry attempts reached. Exiting...');
      throw error;
    }
  }
};

/**
 * Setup MongoDB connection event listeners
 */
const setupConnectionListeners = () => {
  // Connection successful
  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('[MongoDB] Connection established successfully');
  });

  // Connection disconnected
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[MongoDB] Connection disconnected');

    // Attempt to reconnect if not in production or if explicitly needed
    if (process.env.NODE_ENV !== 'test') {
      console.log('[MongoDB] Attempting to reconnect...');
    }
  });

  // Connection error
  mongoose.connection.on('error', (error) => {
    isConnected = false;
    console.error('[MongoDB] Connection error:', error.message);

    // Log additional error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[MongoDB] Error details:', error);
    }
  });

  // Connection reconnected
  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('[MongoDB] Connection reestablished');
  });

  // Connection close
  mongoose.connection.on('close', () => {
    isConnected = false;
    console.log('[MongoDB] Connection closed');
  });

  // MongoDB driver connection pool monitoring (optional but useful)
  mongoose.connection.on('fullsetup', () => {
    console.log('[MongoDB] Connection to all servers in replica set established');
  });

  mongoose.connection.on('all', () => {
    console.log('[MongoDB] All servers in replica set are available');
  });

  // Index build events (useful for debugging in development)
  if (process.env.NODE_ENV === 'development') {
    mongoose.connection.on('index', (index) => {
      console.log('[MongoDB] Index created:', index);
    });
  }
};

/**
 * Main connection function
 */
const connectDB = async () => {
  try {
    // Setup event listeners before connecting
    setupConnectionListeners();

    // Mongoose-specific settings for better performance
    mongoose.set('strictQuery', false); // Prepare for Mongoose 7
    mongoose.set('bufferCommands', false); // Disable command buffering

    // Attempt connection with retry logic
    await connectWithRetry();

  } catch (error) {
    console.error('[MongoDB] Fatal connection error:', error.message);

    // In production, you might want to notify monitoring services here
    if (process.env.NODE_ENV === 'production') {
      // Example: await notifyMonitoringService(error);
    }

    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async () => {
  try {
    console.log('[MongoDB] Closing connection gracefully...');
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[MongoDB] Error during graceful shutdown:', error.message);
    process.exit(1);
  }
};

// Handle process termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

/**
 * Get connection status
 * @returns {boolean} Connection status
 */
export const isDBConnected = () => isConnected;

/**
 * Get connection state
 * @returns {number} Mongoose connection state (0: disconnected, 1: connected, 2: connecting, 3: disconnecting)
 */
export const getConnectionState = () => mongoose.connection.readyState;

export default connectDB;
