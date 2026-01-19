import os from 'os';
import mongoose from 'mongoose';
import AdminActivityLog from '../models/AdminActivityLog.js';

// Mock data for API performance (in production, use a proper monitoring solution)
const apiMetrics = {
  requestCount: 0,
  errorCount: 0,
  successCount: 0,
  responseTimes: [],
  activeRequests: 0
};

// Get system status
export const getSystemStatus = async (req, res) => {
  try {
    // Server health
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const serverStatus = {
      status: 'healthy',
      uptime,
      platform: process.platform,
      nodeVersion: process.version,
      cpu: {
        usage: getCpuUsagePercentage(cpuUsage),
        cores: os.cpus().length
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: Math.round((usedMem / totalMem) * 100),
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed
      },
      disk: await getDiskUsage()
    };

    // Database health
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    let databaseStatus = {
      status: dbStatus,
      collections: 0,
      documents: 0,
      dataSize: 0,
      storageSize: 0,
      indexes: 0,
      avgQueryTime: 0,
      connections: {
        current: 0,
        available: 0
      }
    };

    if (dbState === 1) {
      try {
        const dbStats = await mongoose.connection.db.stats();
        const collections = await mongoose.connection.db.listCollections().toArray();

        let totalDocuments = 0;
        let totalIndexes = 0;

        for (const collection of collections) {
          const collStats = await mongoose.connection.db
            .collection(collection.name)
            .estimatedDocumentCount();
          totalDocuments += collStats;

          const indexes = await mongoose.connection.db
            .collection(collection.name)
            .indexes();
          totalIndexes += indexes.length;
        }

        databaseStatus = {
          status: 'connected',
          collections: collections.length,
          documents: totalDocuments,
          dataSize: dbStats.dataSize || 0,
          storageSize: dbStats.storageSize || 0,
          indexes: totalIndexes,
          avgQueryTime: 0, // Would need query profiling for accurate data
          connections: {
            current: dbStats.connections?.current || 0,
            available: dbStats.connections?.available || 100
          }
        };
      } catch (error) {
        console.error('Error getting database stats:', error);
      }
    }

    // API performance
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;

    // In production, fetch from monitoring service or database
    const apiPerformance = {
      requestCount: apiMetrics.requestCount,
      successRate: apiMetrics.requestCount > 0
        ? Math.round((apiMetrics.successCount / apiMetrics.requestCount) * 100)
        : 100,
      errorCount: apiMetrics.errorCount,
      avgResponseTime: apiMetrics.responseTimes.length > 0
        ? Math.round(
            apiMetrics.responseTimes.reduce((a, b) => a + b, 0) / apiMetrics.responseTimes.length
          )
        : 0,
      minResponseTime: apiMetrics.responseTimes.length > 0
        ? Math.min(...apiMetrics.responseTimes)
        : 0,
      maxResponseTime: apiMetrics.responseTimes.length > 0
        ? Math.max(...apiMetrics.responseTimes)
        : 0,
      activeRequests: apiMetrics.activeRequests
    };

    // Recent errors (from activity log)
    const recentErrors = await AdminActivityLog.find({
      success: false,
      createdAt: { $gte: new Date(last24h) }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('description action createdAt')
      .lean();

    const errors = recentErrors.map(error => ({
      message: error.description,
      endpoint: error.action,
      timestamp: error.createdAt
    }));

    // Service status
    const services = {
      database: dbStatus,
      api: 'up',
      authentication: 'up',
      email: 'up', // Would check SMTP connection in production
      storage: 'up'
    };

    // Overall status
    let overall = 'healthy';
    if (dbStatus !== 'connected') {
      overall = 'error';
    } else if (
      serverStatus.memory.usagePercent > 90 ||
      serverStatus.cpu.usage > 90
    ) {
      overall = 'warning';
    }

    res.json({
      overall,
      server: serverStatus,
      database: databaseStatus,
      api: apiPerformance,
      services,
      errors,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function to get CPU usage percentage
function getCpuUsagePercentage(cpuUsage) {
  // This is a simplified calculation
  // In production, you'd want to track this over time
  const totalUsage = cpuUsage.user + cpuUsage.system;
  const totalTime = process.uptime() * 1000000;
  return Math.min(100, Math.round((totalUsage / totalTime) * 100));
}

// Helper function to get disk usage
async function getDiskUsage() {
  // This is a placeholder. In production, use a library like 'diskusage'
  // or execute system commands based on the platform
  return {
    total: 100 * 1024 * 1024 * 1024, // 100 GB
    used: 50 * 1024 * 1024 * 1024, // 50 GB
    free: 50 * 1024 * 1024 * 1024, // 50 GB
    usagePercent: 50
  };
}

// Middleware to track API metrics (should be added to server.js)
export const trackApiMetrics = (req, res, next) => {
  const start = Date.now();

  apiMetrics.activeRequests++;
  apiMetrics.requestCount++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    apiMetrics.responseTimes.push(duration);

    // Keep only last 1000 response times
    if (apiMetrics.responseTimes.length > 1000) {
      apiMetrics.responseTimes.shift();
    }

    if (res.statusCode >= 200 && res.statusCode < 400) {
      apiMetrics.successCount++;
    } else if (res.statusCode >= 400) {
      apiMetrics.errorCount++;
    }

    apiMetrics.activeRequests--;
  });

  next();
};
