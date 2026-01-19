import AdminActivityLog from '../models/AdminActivityLog.js';

// Get activity logs with filters
export const getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      user,
      action,
      resource,
      severity,
      success,
      startDate,
      endDate,
      search
    } = req.query;

    const query = {};

    if (user) query.user = user;
    if (action) query.action = action;
    if (resource) query['resource.type'] = resource;
    if (severity) query.severity = severity;
    if (success !== undefined) query.success = success === 'true';

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AdminActivityLog.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      AdminActivityLog.countDocuments(query)
    ]);

    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      hasMore: total > skip + logs.length
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get activity statistics
export const getActivityStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await AdminActivityLog.getStatistics(startDate, endDate);

    res.json(stats);
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get user activities
export const getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;

    const result = await AdminActivityLog.getUserActivities(userId, {
      limit: parseInt(limit),
      skip: (page - 1) * limit,
      action,
      startDate,
      endDate
    });

    res.json(result);
  } catch (error) {
    console.error('Get user activities error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get resource activities
export const getResourceActivities = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await AdminActivityLog.getResourceActivities(
      resourceType,
      resourceId,
      {
        limit: parseInt(limit),
        skip: (page - 1) * limit
      }
    );

    res.json(result);
  } catch (error) {
    console.error('Get resource activities error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Export activity logs to CSV
export const exportActivityLogs = async (req, res) => {
  try {
    const {
      user,
      action,
      resource,
      severity,
      success,
      startDate,
      endDate,
      search
    } = req.query;

    const query = {};

    if (user) query.user = user;
    if (action) query.action = action;
    if (resource) query['resource.type'] = resource;
    if (severity) query.severity = severity;
    if (success !== undefined) query.success = success === 'true';

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await AdminActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(10000) // Limit to prevent memory issues
      .lean();

    const headers = [
      'Timestamp',
      'User',
      'Email',
      'Action',
      'Description',
      'Resource Type',
      'Resource Name',
      'Severity',
      'IP Address',
      'Status'
    ];

    const data = logs.map(log => [
      new Date(log.createdAt).toLocaleString(),
      log.userName,
      log.userEmail,
      log.action,
      log.description,
      log.resource.type,
      log.resource.name || '',
      log.severity,
      log.ipAddress,
      log.success ? 'Success' : 'Failed'
    ]);

    const csv = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity_logs_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export activity logs error:', error);
    res.status(500).json({ message: error.message });
  }
};
