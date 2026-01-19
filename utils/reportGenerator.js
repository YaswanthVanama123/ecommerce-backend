import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';

// Generate PDF Report
export const generatePDF = async (data, reportName = 'Report', columns = null) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(reportName, { align: 'center' })
         .moveDown();

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' })
         .moveDown(2);

      // Determine columns
      let displayColumns = columns;
      if (!displayColumns && data.length > 0) {
        displayColumns = Object.keys(data[0]).map(key => ({
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
          key: key
        }));
      }

      if (!displayColumns || displayColumns.length === 0) {
        doc.fontSize(12).text('No data available', { align: 'center' });
        doc.end();
        return;
      }

      // Summary section if first item has summary data
      if (data[0] && (data[0].summary || data[0].totalRevenue || data[0].totalOrders)) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Summary', { underline: true })
           .moveDown(0.5);

        doc.fontSize(10).font('Helvetica');

        const summaryData = data[0].summary || data[0];
        Object.keys(summaryData).forEach(key => {
          if (key !== '_id' && key !== 'data' && typeof summaryData[key] !== 'object') {
            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
            const value = typeof summaryData[key] === 'number'
              ? summaryData[key].toFixed(2)
              : summaryData[key];
            doc.text(`${label}: ${value}`);
          }
        });

        doc.moveDown(1.5);
      }

      // Table
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Detailed Report', { underline: true })
         .moveDown(0.5);

      // Table settings
      const tableTop = doc.y;
      const itemHeight = 25;
      const columnWidth = (doc.page.width - 100) / displayColumns.length;
      let y = tableTop;

      doc.fontSize(9).font('Helvetica-Bold');

      // Draw header
      displayColumns.forEach((col, i) => {
        const x = 50 + (i * columnWidth);
        doc.rect(x, y, columnWidth, itemHeight).stroke();
        doc.text(col.header || col, x + 5, y + 8, {
          width: columnWidth - 10,
          ellipsis: true
        });
      });

      y += itemHeight;
      doc.font('Helvetica').fontSize(8);

      // Draw rows
      const maxRows = Math.min(data.length, 25); // Limit rows per page
      for (let i = 0; i < maxRows; i++) {
        const item = data[i];

        // Check if we need a new page
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;

          // Redraw header on new page
          doc.fontSize(9).font('Helvetica-Bold');
          displayColumns.forEach((col, j) => {
            const x = 50 + (j * columnWidth);
            doc.rect(x, y, columnWidth, itemHeight).stroke();
            doc.text(col.header || col, x + 5, y + 8, {
              width: columnWidth - 10,
              ellipsis: true
            });
          });
          y += itemHeight;
          doc.font('Helvetica').fontSize(8);
        }

        displayColumns.forEach((col, j) => {
          const x = 50 + (j * columnWidth);
          const key = col.key || col;
          let value = item[key];

          // Format value
          if (value === null || value === undefined) {
            value = '-';
          } else if (typeof value === 'number') {
            value = value.toFixed(2);
          } else if (value instanceof Date) {
            value = value.toLocaleDateString();
          } else if (typeof value === 'object') {
            value = JSON.stringify(value).substring(0, 20) + '...';
          } else {
            value = String(value).substring(0, 30);
          }

          doc.rect(x, y, columnWidth, itemHeight).stroke();
          doc.text(value, x + 5, y + 8, {
            width: columnWidth - 10,
            ellipsis: true
          });
        });

        y += itemHeight;
      }

      if (data.length > maxRows) {
        doc.moveDown(2)
           .fontSize(8)
           .text(`Note: Showing ${maxRows} of ${data.length} records. Download Excel for complete data.`, {
             align: 'center',
             color: 'gray'
           });
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .font('Helvetica')
           .text(
             `Page ${i + 1} of ${pages.count}`,
             50,
             doc.page.height - 50,
             { align: 'center' }
           );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Excel Report
export const generateExcel = async (data, reportName = 'Report', columns = null) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportName);

    // Set workbook properties
    workbook.creator = 'Admin Dashboard';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Determine columns
    let displayColumns = columns;
    if (!displayColumns && data.length > 0) {
      displayColumns = Object.keys(data[0]).map(key => ({
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
        key: key,
        width: 20
      }));
    }

    // Set columns
    worksheet.columns = displayColumns.map(col => ({
      header: col.header || col,
      key: col.key || col,
      width: col.width || 20
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 25;

    // Add data rows
    data.forEach((item, index) => {
      const row = worksheet.addRow(item);

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }

      // Format cells
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };

        // Format numbers
        if (typeof cell.value === 'number') {
          cell.numFmt = '#,##0.00';
        }

        // Format dates
        if (cell.value instanceof Date) {
          cell.numFmt = 'yyyy-mm-dd hh:mm:ss';
        }
      });
    });

    // Add summary sheet if applicable
    if (data.length > 0 && (data[0].summary || data[0].totalRevenue)) {
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ];

      // Style summary header
      summarySheet.getRow(1).font = { bold: true, size: 12 };
      summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
      };
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      const summaryData = data[0].summary || data[0];
      Object.keys(summaryData).forEach(key => {
        if (key !== '_id' && key !== 'data' && typeof summaryData[key] !== 'object') {
          summarySheet.addRow({
            metric: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
            value: summaryData[key]
          });
        }
      });
    }

    // Add metadata sheet
    const metaSheet = workbook.addWorksheet('Metadata');
    metaSheet.addRow(['Report Name', reportName]);
    metaSheet.addRow(['Generated On', new Date().toLocaleString()]);
    metaSheet.addRow(['Total Records', data.length]);
    metaSheet.addRow(['Generated By', 'Admin Dashboard']);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error('Excel generation error:', error);
    throw error;
  }
};

// Generate CSV Report
export const generateCSV = async (data, columns = null) => {
  try {
    // Flatten nested objects for CSV
    const flattenedData = data.map(item => {
      const flattened = {};
      Object.keys(item).forEach(key => {
        if (typeof item[key] === 'object' && item[key] !== null && !(item[key] instanceof Date)) {
          // Flatten nested objects
          if (Array.isArray(item[key])) {
            flattened[key] = JSON.stringify(item[key]);
          } else {
            Object.keys(item[key]).forEach(nestedKey => {
              flattened[`${key}_${nestedKey}`] = item[key][nestedKey];
            });
          }
        } else {
          flattened[key] = item[key];
        }
      });
      return flattened;
    });

    // Determine fields
    let fields = columns
      ? columns.map(col => ({
          label: col.header || col,
          value: col.key || col
        }))
      : Object.keys(flattenedData[0] || {}).map(key => ({
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
          value: key
        }));

    const parser = new Parser({ fields });
    const csv = parser.parse(flattenedData);

    return Buffer.from(csv, 'utf-8');
  } catch (error) {
    console.error('CSV generation error:', error);
    throw error;
  }
};

// Generate report preview (HTML format for email)
export const generateHTMLPreview = (data, reportName, columns = null) => {
  try {
    let displayColumns = columns;
    if (!displayColumns && data.length > 0) {
      displayColumns = Object.keys(data[0]).map(key => ({
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
        key: key
      }));
    }

    const headerRow = displayColumns
      .map(col => `<th style="padding: 12px; background-color: #4472C4; color: white; text-align: left;">${col.header || col}</th>`)
      .join('');

    const dataRows = data.slice(0, 10).map((item, index) => {
      const bgColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
      const cells = displayColumns
        .map(col => {
          const key = col.key || col;
          let value = item[key];

          if (value === null || value === undefined) {
            value = '-';
          } else if (typeof value === 'number') {
            value = value.toFixed(2);
          } else if (value instanceof Date) {
            value = value.toLocaleDateString();
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }

          return `<td style="padding: 12px; border-bottom: 1px solid #ddd;">${value}</td>`;
        })
        .join('');

      return `<tr style="background-color: ${bgColor};">${cells}</tr>`;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { color: #333; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { font-weight: bold; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportName}</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>${headerRow}</tr>
          </thead>
          <tbody>
            ${dataRows}
          </tbody>
        </table>
        ${data.length > 10 ? `<p style="margin-top: 20px; text-align: center; color: #666;">Showing 10 of ${data.length} records</p>` : ''}
        <div class="footer">
          <p>This is an automated report generated by Admin Dashboard</p>
        </div>
      </body>
      </html>
    `;

    return html;
  } catch (error) {
    console.error('HTML preview generation error:', error);
    throw error;
  }
};

// Helper function to format data for reports
export const formatReportData = (data, type = 'general') => {
  switch(type) {
    case 'sales':
      return data.map(item => ({
        date: item._id,
        orders: item.totalOrders,
        revenue: `$${item.totalRevenue.toFixed(2)}`,
        avgOrderValue: `$${item.averageOrderValue.toFixed(2)}`,
        completed: item.completedOrders,
        cancelled: item.cancelledOrders
      }));

    case 'revenue':
      return data.map(item => ({
        category: item.category || item._id,
        revenue: `$${item.revenue.toFixed(2)}`,
        orders: item.orderCount || item.orders,
        itemsSold: item.itemsSold
      }));

    case 'inventory':
      return data.map(item => ({
        product: item.name,
        sku: item.sku,
        category: item.category,
        stock: item.stock,
        price: `$${item.price.toFixed(2)}`,
        value: `$${item.stockValue.toFixed(2)}`,
        status: item.status
      }));

    case 'customers':
      return data.map(item => ({
        name: item.customerName,
        email: item.email,
        totalOrders: item.totalOrders,
        totalSpent: `$${item.totalSpent.toFixed(2)}`,
        avgOrderValue: `$${item.averageOrderValue.toFixed(2)}`,
        lastOrder: new Date(item.lastOrderDate).toLocaleDateString()
      }));

    case 'products':
      return data.map(item => ({
        product: item.productName,
        revenue: `$${item.totalRevenue.toFixed(2)}`,
        quantitySold: item.totalQuantitySold,
        orders: item.totalOrders,
        avgPrice: `$${item.averagePrice.toFixed(2)}`
      }));

    default:
      return data;
  }
};

export default {
  generatePDF,
  generateExcel,
  generateCSV,
  generateHTMLPreview,
  formatReportData
};
