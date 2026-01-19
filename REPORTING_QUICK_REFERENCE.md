# Reporting System Quick Reference

## Quick Start

### Access Reports
Navigate to: **Sidebar > Reports** or visit `/reports`

### Generate a Report
1. Select report type (Sales/Revenue/Inventory/Customers/Products)
2. Choose date range
3. Click "Generate Report"
4. View charts and tables
5. Export as PDF/Excel/CSV

## Available Reports

| Report Type | Description | Key Metrics |
|------------|-------------|-------------|
| **Sales** | Daily/weekly sales analysis | Total orders, revenue, avg order value |
| **Revenue** | Revenue by category/product | Category revenue, items sold |
| **Inventory** | Stock levels and valuation | Total products, low stock, out of stock |
| **Customers** | Customer spending patterns | Total customers, lifetime value, segments |
| **Products** | Product performance metrics | Revenue per product, quantity sold |
| **Top Performers** | Best performing items | Top 10 by revenue |

## Export Formats

### PDF
- Professional formatted reports
- Charts and tables included
- Limited to 25 rows per page
- Best for: Presentations, executive summaries

### Excel (XLSX)
- Multi-sheet workbooks
- Formatted cells and headers
- All data included
- Best for: Data analysis, further processing

### CSV
- Raw comma-separated data
- No formatting
- All data included
- Best for: Import to other systems

## API Quick Reference

### Generate Reports

```javascript
// Sales Report
GET /api/admin/reports/sales?startDate=2025-01-01&endDate=2025-01-31&groupBy=day

// Revenue Report
GET /api/admin/reports/revenue?startDate=2025-01-01&endDate=2025-01-31

// Inventory Report
GET /api/admin/reports/inventory?lowStockThreshold=10

// Customer Report
GET /api/admin/reports/customers?startDate=2025-01-01&endDate=2025-01-31

// Product Performance
GET /api/admin/reports/products?startDate=2025-01-01&endDate=2025-01-31
```

### Export Report

```javascript
POST /api/admin/reports/export
{
  "reportData": [...],
  "format": "pdf|excel|csv",
  "reportName": "report_name"
}
```

## Date Range Presets

- **Today**: Current date
- **Yesterday**: Previous day
- **Last 7 days**: Past week
- **Last 30 days**: Past month
- **This Month**: Current month (1st to today)
- **Last Month**: Previous month (full)
- **This Quarter**: Current quarter
- **This Year**: Jan 1 to today
- **Custom**: Specify exact dates

## Group By Options (Sales Report)

- **Hour**: Hourly breakdown (24-hour periods)
- **Day**: Daily summary (default)
- **Week**: Weekly aggregation
- **Month**: Monthly totals
- **Year**: Yearly overview

## Report Components

### Summary Cards
Quick overview metrics displayed at the top:
- Sales: Total Orders, Revenue, Avg Order Value
- Inventory: Total Products, Low Stock, Out of Stock, Total Value
- Customers: Total Customers, Revenue, Avg Customer Value

### Charts
Visual representation of data:
- **Line Charts**: Trends over time (Sales)
- **Bar Charts**: Comparisons (Revenue, Inventory)
- **Pie Charts**: Distributions (Top Performers)

### Data Tables
Detailed records:
- First 20 rows displayed
- Sortable columns
- Formatted currency and numbers
- Status indicators

## Scheduled Reports

### Create Schedule

1. Navigate to Reports page
2. Generate desired report
3. Click "Schedule Report" (future feature)
4. Configure:
   - Frequency (daily/weekly/monthly)
   - Time (HH:MM)
   - Recipients (email addresses)
   - Format (PDF/Excel/CSV)

### Schedule Options

- **Daily**: Every day at specified time
- **Weekly**: Every week on specified day
- **Monthly**: First day of each month
- **Quarterly**: First day of Jan/Apr/Jul/Oct
- **Yearly**: January 1st

## Common Use Cases

### 1. Daily Sales Review
```
Report: Sales
Date: Yesterday
Group By: Hour
Export: PDF
```

### 2. Monthly Revenue Analysis
```
Report: Revenue
Date: Last Month
Group By: Category
Export: Excel
```

### 3. Inventory Check
```
Report: Inventory
Low Stock Threshold: 10
Export: CSV (for reordering)
```

### 4. Customer Insights
```
Report: Customers
Date: Last Quarter
Min Orders: 3
Export: Excel
```

### 5. Product Performance Review
```
Report: Products
Date: Last 30 Days
Sort By: Revenue
Export: PDF
```

## Tips & Best Practices

### Performance
- Use shorter date ranges for faster results
- Generate large reports during off-peak hours
- Export to Excel for datasets > 1000 rows

### Accuracy
- Verify date ranges before generating
- Check timezone settings
- Cross-reference with dashboard metrics

### Exporting
- PDF: Best for < 100 records
- Excel: Best for analysis and manipulation
- CSV: Best for data import to other systems

### Scheduling
- Schedule heavy reports for overnight
- Send to distribution lists
- Use descriptive report names

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No data in report | Check date range has orders/data |
| Export fails | Try smaller dataset or different format |
| Charts not showing | Ensure browser JavaScript enabled |
| Slow loading | Reduce date range or use filters |

## Keyboard Shortcuts

- `Ctrl/Cmd + G`: Generate report (when focused)
- `Ctrl/Cmd + E`: Export current report
- `Ctrl/Cmd + R`: Reset filters
- `Tab`: Navigate between fields

## File Locations

### Backend
- Routes: `/backend/routes/reportRoutes.js`
- Controller: `/backend/controllers/reportController.js`
- Generator: `/backend/utils/reportGenerator.js`

### Frontend
- Main Page: `/admin-webapp/src/pages/Reports.jsx`
- Templates: `/admin-webapp/src/components/Reports/`

## Dependencies

### Required
- Node.js 16+
- MongoDB 5+
- React 19+

### Packages
- Backend: pdfkit, exceljs, json2csv, node-cron
- Frontend: recharts, axios, react-toastify

## API Response Format

```javascript
{
  "success": true,
  "data": [...],        // Report data array
  "summary": {...},     // Summary metrics (optional)
  "filters": {...},     // Applied filters
  "totalRevenue": 0     // Total (for revenue reports)
}
```

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Invalid date range | Check start < end date |
| 401 | Unauthorized | Login required |
| 403 | Admin access required | Need admin role |
| 500 | Report generation failed | Check server logs |

## Support Resources

- Full Documentation: `REPORTING_SYSTEM_DOCUMENTATION.md`
- API Testing: Use Postman collection
- Logs: `/backend/logs/`
- Console: Browser DevTools

## Version Info

- **Version**: 1.0.0
- **Released**: January 19, 2025
- **Compatibility**: Admin Dashboard v2.0+

---

For detailed information, see: `REPORTING_SYSTEM_DOCUMENTATION.md`
