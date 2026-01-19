# Comprehensive Reporting System Documentation

## Overview

A complete reporting and analytics system for the admin dashboard with automated scheduling, multiple export formats, and real-time data visualization.

## Features

### Backend Features

#### 1. Report Types
- **Sales Reports**: Daily/weekly/monthly sales analysis with order metrics
- **Revenue Reports**: Revenue breakdown by category and product
- **Inventory Reports**: Stock levels, valuation, low stock alerts
- **Customer Reports**: Customer lifetime value, segmentation, spending patterns
- **Product Performance**: Top/bottom performers, sales metrics, turnover rates
- **Custom Reports**: Build dynamic reports with custom filters and metrics

#### 2. Export Formats
- **PDF**: Professional formatted reports with charts and tables
- **Excel (XLSX)**: Multi-sheet workbooks with formatting and formulas
- **CSV**: Raw data export for further analysis

#### 3. Scheduled Reports
- Automated report generation (daily/weekly/monthly/quarterly/yearly)
- Email delivery to multiple recipients
- Report history tracking
- Configurable time and timezone settings

#### 4. Advanced Features
- Real-time aggregation pipelines
- Customizable date ranges
- Multiple grouping options (hour/day/week/month/year)
- Performance optimized queries
- Top/bottom performer analysis

### Frontend Features

#### 1. Interactive Dashboard
- Report type selection
- Date range filters
- Dynamic data visualization (charts and graphs)
- Export buttons (PDF/Excel/CSV)
- Summary cards with key metrics

#### 2. Visualizations
- Line charts for trends
- Bar charts for comparisons
- Pie charts for distributions
- Responsive tables with detailed data

#### 3. Report Templates
- Sales Report Template
- Revenue Report Template
- Inventory Report Template
- Customer Report Template

## File Structure

### Backend Files

```
backend/
├── routes/
│   └── reportRoutes.js                 # All report endpoints
├── controllers/
│   └── reportController.js             # Report generation logic
├── models/
│   └── ScheduledReport.js              # Scheduled reports model
├── utils/
│   ├── reportGenerator.js              # PDF/Excel/CSV generation
│   ├── reportScheduler.js              # Cron job scheduler
│   └── emailTemplates.js               # Email templates (updated)
└── server.js                            # Routes integration
```

### Frontend Files

```
admin-webapp/src/
├── pages/
│   └── Reports.jsx                     # Main reports page
├── components/
│   └── Reports/
│       ├── SalesReportTemplate.jsx     # Sales report UI
│       ├── RevenueReportTemplate.jsx   # Revenue report UI
│       ├── InventoryReportTemplate.jsx # Inventory report UI
│       └── CustomerReportTemplate.jsx  # Customer report UI
└── App.jsx                              # Route added
```

## API Endpoints

### Report Generation

#### Get Sales Report
```
GET /api/admin/reports/sales
Query Parameters:
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD
  - groupBy: hour|day|week|month|year
```

#### Get Revenue Report
```
GET /api/admin/reports/revenue
Query Parameters:
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD
  - groupBy: category|time
```

#### Get Inventory Report
```
GET /api/admin/reports/inventory
Query Parameters:
  - lowStockThreshold: number (default: 10)
  - category: string (optional)
```

#### Get Customer Report
```
GET /api/admin/reports/customers
Query Parameters:
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD
  - minOrders: number (default: 1)
```

#### Get Product Performance Report
```
GET /api/admin/reports/products
Query Parameters:
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD
  - sortBy: revenue|quantity|orders
```

#### Get Top Performers
```
GET /api/admin/reports/top-performers
Query Parameters:
  - type: products|customers|categories
  - limit: number (default: 10)
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD
```

#### Get Bottom Performers
```
GET /api/admin/reports/bottom-performers
Query Parameters:
  - type: products|categories
  - limit: number (default: 10)
  - startDate: YYYY-MM-DD
  - endDate: YYYY-MM-DD
```

### Export Reports

#### Export Report
```
POST /api/admin/reports/export
Body:
{
  "reportData": Array,
  "format": "pdf|excel|csv",
  "reportName": "string",
  "columns": Array (optional)
}
Response: Binary file download
```

### Scheduled Reports

#### Get Scheduled Reports
```
GET /api/admin/reports/scheduled
```

#### Create Scheduled Report
```
POST /api/admin/reports/scheduled
Body:
{
  "name": "Daily Sales Report",
  "reportType": "sales",
  "schedule": {
    "frequency": "daily",
    "time": "09:00",
    "timezone": "UTC"
  },
  "recipients": [
    { "email": "admin@example.com", "name": "Admin" }
  ],
  "filters": { ... },
  "format": "pdf|excel|csv|all"
}
```

#### Update Scheduled Report
```
PUT /api/admin/reports/scheduled/:id
Body: Same as create
```

#### Delete Scheduled Report
```
DELETE /api/admin/reports/scheduled/:id
```

#### Get Report History
```
GET /api/admin/reports/history
Query Parameters:
  - limit: number (default: 50)
```

## Usage Examples

### 1. Generate Sales Report

```javascript
// Frontend
const response = await axios.get('/api/admin/reports/sales', {
  params: {
    startDate: '2025-01-01',
    endDate: '2025-01-19',
    groupBy: 'day'
  },
  headers: { Authorization: `Bearer ${token}` }
});

// Response
{
  "success": true,
  "data": [
    {
      "_id": "2025-01-01",
      "totalOrders": 45,
      "totalRevenue": 5678.90,
      "averageOrderValue": 126.20,
      "completedOrders": 42,
      "cancelledOrders": 3
    },
    ...
  ],
  "summary": {
    "totalOrders": 890,
    "totalRevenue": 112450.30,
    "averageOrderValue": 126.35
  }
}
```

### 2. Export Report to PDF

```javascript
// Frontend
const response = await axios.post(
  '/api/admin/reports/export',
  {
    reportData: salesData,
    format: 'pdf',
    reportName: 'Sales_Report_January_2025',
    columns: [
      { header: 'Date', key: '_id' },
      { header: 'Orders', key: 'totalOrders' },
      { header: 'Revenue', key: 'totalRevenue' }
    ]
  },
  {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob'
  }
);

// Create download
const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.setAttribute('download', 'sales_report.pdf');
document.body.appendChild(link);
link.click();
link.remove();
```

### 3. Schedule Daily Report

```javascript
// Frontend
const response = await axios.post(
  '/api/admin/reports/scheduled',
  {
    name: 'Daily Sales Summary',
    reportType: 'sales',
    schedule: {
      frequency: 'daily',
      time: '09:00',
      timezone: 'UTC'
    },
    recipients: [
      { email: 'manager@example.com', name: 'Store Manager' },
      { email: 'admin@example.com', name: 'Admin' }
    ],
    format: 'pdf'
  },
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
```

## Report Scheduler Setup

### Initialize Scheduler

Add to server.js:

```javascript
import reportScheduler from './utils/reportScheduler.js';

// After database connection
connectDB().then(() => {
  // Initialize report scheduler
  reportScheduler.initialize();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  reportScheduler.shutdown();
  process.exit(0);
});
```

### Cron Schedule Patterns

- **Daily**: `0 9 * * *` (9 AM every day)
- **Weekly**: `0 9 * * 1` (9 AM every Monday)
- **Monthly**: `0 9 1 * *` (9 AM on 1st of month)
- **Quarterly**: `0 9 1 1,4,7,10 *` (9 AM on 1st of Jan, Apr, Jul, Oct)
- **Yearly**: `0 9 1 1 *` (9 AM on Jan 1st)

## Email Templates

Email templates are defined in `/backend/utils/emailTemplates.js`:

- **Scheduled Report Email**: General report delivery
- **Sales Report Email**: Sales-specific summary
- **Inventory Alert Email**: Low stock notifications
- **Revenue Report Email**: Revenue breakdown

## Dependencies

### Backend Dependencies

```json
{
  "pdfkit": "^0.17.2",          // PDF generation
  "exceljs": "^4.4.0",           // Excel generation
  "json2csv": "^6.0.0-alpha.2",  // CSV generation
  "node-cron": "^3.0.3",         // Task scheduling
  "nodemailer": "^7.0.12"        // Email sending
}
```

### Frontend Dependencies

```json
{
  "recharts": "^3.6.0",          // Data visualization
  "axios": "^1.13.2",            // HTTP client
  "react-toastify": "^11.0.5"    // Notifications
}
```

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install node-cron
```

### 2. No New Frontend Dependencies Needed
All required frontend packages are already installed.

### 3. Environment Variables

Add to `.env`:

```env
# Admin Client URL for email links
ADMIN_CLIENT_URL=http://localhost:3001

# Email Configuration (if not already set)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. Start Services

```bash
# Backend
cd backend
npm start

# Frontend
cd admin-webapp
npm run dev
```

## Navigation

Access reports at:
- **URL**: http://localhost:3001/reports
- **Menu**: Sidebar > Reports

## Security

All report endpoints require:
1. Authentication (valid JWT token)
2. Admin role authorization
3. Rate limiting via API limiter

## Performance Considerations

- Reports use MongoDB aggregation pipelines for efficiency
- Large datasets are paginated (default: 50 records in tables)
- Charts show maximum 25 items to prevent overload
- Export operations use streaming for large files
- Scheduled reports run during off-peak hours

## Troubleshooting

### Common Issues

1. **Report Not Generating**
   - Check MongoDB connection
   - Verify date range has data
   - Check console for aggregation errors

2. **Export Not Working**
   - Ensure pdfkit/exceljs dependencies installed
   - Check file permissions
   - Verify responseType: 'blob' in frontend

3. **Scheduled Reports Not Running**
   - Verify reportScheduler.initialize() called
   - Check cron pattern syntax
   - Review server logs for errors

4. **Email Not Sending**
   - Verify email configuration in .env
   - Check nodemailer setup
   - Test email service credentials

## Future Enhancements

Potential additions:
- Dashboard widgets for quick metrics
- Report templates library
- Advanced filtering (multi-select, operators)
- Comparison reports (YoY, MoM)
- Forecasting and predictions
- Custom branding for reports
- Report sharing via links
- Role-based report access

## Support

For issues or questions:
1. Check server logs: `backend/logs/`
2. Review MongoDB queries
3. Test API endpoints with Postman
4. Check browser console for frontend errors

---

**Version**: 1.0.0
**Last Updated**: January 19, 2025
**Created By**: Admin Dashboard Development Team
