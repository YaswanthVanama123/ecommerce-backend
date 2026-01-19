import cron from 'node-cron';
import ScheduledReport from '../models/ScheduledReport.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { generatePDF, generateExcel, generateCSV, generateHTMLPreview } from './reportGenerator.js';
import { sendEmail } from './emailService.js';

class ReportScheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize scheduler
  async initialize() {
    if (this.isInitialized) {
      console.log('Report scheduler already initialized');
      return;
    }

    try {
      console.log('Initializing report scheduler...');

      // Load all enabled scheduled reports
      const scheduledReports = await ScheduledReport.find({ enabled: true });

      scheduledReports.forEach(report => {
        this.scheduleReport(report);
      });

      // Run check every hour for any missed reports
      cron.schedule('0 * * * *', () => {
        this.checkMissedReports();
      });

      this.isInitialized = true;
      console.log(`Report scheduler initialized with ${scheduledReports.length} active schedules`);
    } catch (error) {
      console.error('Error initializing report scheduler:', error);
    }
  }

  // Schedule a report
  scheduleReport(report) {
    try {
      const cronExpression = this.getCronExpression(report.schedule);

      if (!cronExpression) {
        console.error(`Invalid schedule for report: ${report.name}`);
        return;
      }

      // Cancel existing job if any
      if (this.jobs.has(report._id.toString())) {
        this.jobs.get(report._id.toString()).stop();
      }

      // Create new cron job
      const job = cron.schedule(cronExpression, async () => {
        await this.executeReport(report._id);
      });

      this.jobs.set(report._id.toString(), job);

      console.log(`Scheduled report: ${report.name} with cron: ${cronExpression}`);
    } catch (error) {
      console.error(`Error scheduling report ${report.name}:`, error);
    }
  }

  // Get cron expression from schedule
  getCronExpression(schedule) {
    const [hours, minutes] = (schedule.time || '09:00').split(':');

    switch(schedule.frequency) {
      case 'daily':
        return `${minutes} ${hours} * * *`;

      case 'weekly':
        const dayOfWeek = schedule.dayOfWeek || 1; // Default Monday
        return `${minutes} ${hours} * * ${dayOfWeek}`;

      case 'monthly':
        const dayOfMonth = schedule.dayOfMonth || 1;
        return `${minutes} ${hours} ${dayOfMonth} * *`;

      case 'quarterly':
        // Run on 1st day of Jan, Apr, Jul, Oct
        return `${minutes} ${hours} 1 1,4,7,10 *`;

      case 'yearly':
        // Run on Jan 1st
        return `${minutes} ${hours} 1 1 *`;

      default:
        return null;
    }
  }

  // Execute a report
  async executeReport(reportId) {
    let report;
    try {
      console.log(`Executing scheduled report: ${reportId}`);

      // Fetch report details
      report = await ScheduledReport.findById(reportId);

      if (!report || !report.enabled) {
        console.log(`Report ${reportId} not found or disabled`);
        return;
      }

      // Generate report data based on type
      const reportData = await this.generateReportData(report);

      if (!reportData || reportData.length === 0) {
        console.log(`No data available for report: ${report.name}`);
        report.addToHistory('failed', 0, 'No data available');
        await report.save();
        return;
      }

      // Generate files based on format
      const files = await this.generateReportFiles(report, reportData);

      // Send emails to recipients
      let successCount = 0;
      for (const recipient of report.recipients) {
        try {
          await this.sendReportEmail(recipient, report, files, reportData);
          successCount++;
        } catch (emailError) {
          console.error(`Error sending report to ${recipient.email}:`, emailError);
        }
      }

      // Update report history
      const fileSize = files.reduce((sum, file) => sum + file.buffer.length, 0);
      report.addToHistory('success', successCount, null, fileSize);
      report.calculateNextRun();
      await report.save();

      console.log(`Report ${report.name} executed successfully. Sent to ${successCount}/${report.recipients.length} recipients`);
    } catch (error) {
      console.error(`Error executing report ${reportId}:`, error);

      if (report) {
        report.addToHistory('failed', 0, error.message);
        report.calculateNextRun();
        await report.save();
      }
    }
  }

  // Generate report data based on type
  async generateReportData(report) {
    const { reportType, filters } = report;

    // Build date range
    const dateRange = this.getDateRange(report.schedule.frequency, filters);

    const matchStage = {};
    if (dateRange.startDate) {
      matchStage.createdAt = {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      };
    }

    switch(reportType) {
      case 'sales':
        return await this.generateSalesData(matchStage);

      case 'revenue':
        return await this.generateRevenueData(matchStage);

      case 'inventory':
        return await this.generateInventoryData(filters);

      case 'customers':
        return await this.generateCustomerData(matchStage);

      case 'products':
        return await this.generateProductData(matchStage);

      default:
        return [];
    }
  }

  // Get date range based on frequency
  getDateRange(frequency, customFilters = {}) {
    if (customFilters.startDate && customFilters.endDate) {
      return {
        startDate: new Date(customFilters.startDate),
        endDate: new Date(customFilters.endDate)
      };
    }

    const endDate = new Date();
    const startDate = new Date();

    switch(frequency) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  // Generate sales data
  async generateSalesData(matchStage) {
    return await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  // Generate revenue data
  async generateRevenueData(matchStage) {
    matchStage.status = { $in: ['delivered', 'shipped'] };

    return await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$categoryInfo.name',
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          itemsSold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);
  }

  // Generate inventory data
  async generateInventoryData(filters) {
    const matchStage = {};
    if (filters.category) {
      matchStage.category = filters.category;
    }

    return await Product.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          sku: 1,
          category: '$categoryInfo.name',
          stock: 1,
          price: 1,
          stockValue: { $multiply: ['$stock', '$price'] }
        }
      },
      { $sort: { stock: 1 } }
    ]);
  }

  // Generate customer data
  async generateCustomerData(matchStage) {
    return await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          name: '$userInfo.name',
          email: '$userInfo.email',
          totalOrders: 1,
          totalSpent: 1
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 100 }
    ]);
  }

  // Generate product data
  async generateProductData(matchStage) {
    matchStage.status = { $in: ['delivered', 'shipped'] };

    return await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          quantitySold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 50 }
    ]);
  }

  // Generate report files
  async generateReportFiles(report, data) {
    const files = [];
    const formats = report.format === 'all' ? ['pdf', 'excel', 'csv'] : [report.format];

    for (const format of formats) {
      try {
        let buffer;
        let filename;
        let contentType;

        switch(format) {
          case 'pdf':
            buffer = await generatePDF(data, report.name);
            filename = `${report.name}_${new Date().toISOString().split('T')[0]}.pdf`;
            contentType = 'application/pdf';
            break;

          case 'excel':
            buffer = await generateExcel(data, report.name);
            filename = `${report.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;

          case 'csv':
            buffer = await generateCSV(data);
            filename = `${report.name}_${new Date().toISOString().split('T')[0]}.csv`;
            contentType = 'text/csv';
            break;
        }

        files.push({ buffer, filename, contentType });
      } catch (error) {
        console.error(`Error generating ${format} file:`, error);
      }
    }

    return files;
  }

  // Send report email
  async sendReportEmail(recipient, report, files, data) {
    const htmlPreview = generateHTMLPreview(data.slice(0, 10), report.name);

    const attachments = files.map(file => ({
      filename: file.filename,
      content: file.buffer,
      contentType: file.contentType
    }));

    const emailOptions = {
      to: recipient.email,
      subject: `Scheduled Report: ${report.name} - ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Scheduled Report: ${report.name}</h2>
          <p>Hello ${recipient.name || 'Admin'},</p>
          <p>Your scheduled ${report.reportType} report is ready. Please find the report attached.</p>
          <div style="margin: 20px 0;">
            <h3>Report Preview:</h3>
            ${htmlPreview}
          </div>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            This is an automated report scheduled to run ${report.schedule.frequency}.<br>
            To modify or stop this report, please contact your administrator.
          </p>
        </div>
      `,
      attachments
    };

    await sendEmail(emailOptions);
  }

  // Cancel a scheduled report
  cancelReport(reportId) {
    const jobKey = reportId.toString();
    if (this.jobs.has(jobKey)) {
      this.jobs.get(jobKey).stop();
      this.jobs.delete(jobKey);
      console.log(`Cancelled scheduled report: ${reportId}`);
    }
  }

  // Update a scheduled report
  async updateReport(reportId) {
    try {
      const report = await ScheduledReport.findById(reportId);

      if (!report) {
        console.log(`Report ${reportId} not found`);
        return;
      }

      if (report.enabled) {
        this.scheduleReport(report);
      } else {
        this.cancelReport(reportId);
      }
    } catch (error) {
      console.error(`Error updating scheduled report ${reportId}:`, error);
    }
  }

  // Check for missed reports
  async checkMissedReports() {
    try {
      const now = new Date();
      const missedReports = await ScheduledReport.find({
        enabled: true,
        nextRun: { $lt: now }
      });

      for (const report of missedReports) {
        console.log(`Found missed report: ${report.name}`);
        await this.executeReport(report._id);
      }
    } catch (error) {
      console.error('Error checking missed reports:', error);
    }
  }

  // Get scheduler statistics
  getStatistics() {
    return {
      activeJobs: this.jobs.size,
      isInitialized: this.isInitialized,
      scheduledReports: Array.from(this.jobs.keys())
    };
  }

  // Shutdown scheduler
  shutdown() {
    console.log('Shutting down report scheduler...');
    this.jobs.forEach((job, reportId) => {
      job.stop();
      console.log(`Stopped job for report: ${reportId}`);
    });
    this.jobs.clear();
    this.isInitialized = false;
    console.log('Report scheduler shut down successfully');
  }
}

// Create singleton instance
const reportScheduler = new ReportScheduler();

export default reportScheduler;
