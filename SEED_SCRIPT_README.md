# Database Seed Script Documentation

## Overview

The seed script (`scripts/seed.js`) is a comprehensive database initialization tool that populates your MongoDB database with realistic sample data for an Indian e-commerce platform.

## Features

### Data Seeding
- **1 Superadmin User** - Complete administrative access
- **2 Admin Users** - Administrative access with restrictions
- **10 Regular Users** - Customer accounts with Indian names and locations
- **5 Product Categories** - Men's Clothing, Women's Clothing, Electronics, Accessories, Shoes
- **50 Products** - Realistic e-commerce products with:
  - Detailed descriptions
  - Multiple colors and sizes
  - Pricing with discounts
  - Stock tracking
  - Product images (placeholder URLs)
  - Featured product flags
  - Brand information
- **20 Sample Orders** - Various order statuses and payment methods

### Safety Features
- **Data Confirmation** - Requires user confirmation before clearing existing data
- **Connection Verification** - Validates MongoDB connection
- **Error Handling** - Comprehensive error messages and graceful exit
- **Transaction Support** - Proper cleanup on failures

## Installation

The script is already configured in your project. No additional installation needed.

## Usage

### Running the Seed Script

```bash
npm run seed
```

### Interactive Mode

When you run the script, it will prompt you for confirmation:

```
This will clear all existing data and seed the database with sample data. Continue? (yes/no):
```

Type `yes` or `y` to proceed, or any other input to cancel.

## Test Credentials

After successful seeding, use these credentials to test your application:

### Superadmin Account
- **Email:** superadmin@ecom.com
- **Password:** Super@123
- **Permissions:** Full system access

### Admin Accounts
- **Admin 1:**
  - Email: admin1@ecom.com
  - Password: Admin@123

- **Admin 2:**
  - Email: admin2@ecom.com
  - Password: Admin@123

### Sample Regular User
- **Email:** rahul.sharma@mail.com
- **Password:** User@1234
- **Other users:** priya.singh@mail.com, amit.patel@mail.com, etc.

## Sample Data Details

### Categories
1. **Men's Clothing** - 7 products
   - Premium Cotton T-Shirt
   - Classic Denim Jeans
   - Formal Shirt
   - Leather Jacket
   - Casual Shorts
   - Sports Hoodie
   - Polo Shirt

2. **Women's Clothing** - 7 products
   - Casual Kurti
   - Cotton Saree
   - Casual Dress
   - Leggings Set
   - Top & Bottom Combo
   - Blazer
   - Anarkali Suit

3. **Electronics** - 5 products
   - Wireless Earbuds
   - USB-C Charging Cable
   - Power Bank 20000mAh
   - Screen Protector
   - Bluetooth Speaker

4. **Accessories** - 5 products
   - Leather Wallet
   - Analog Wristwatch
   - Canvas Backpack
   - Sunglasses
   - Silk Scarf

5. **Shoes** - 5 products
   - Casual Sneakers
   - Formal Shoes
   - Sports Shoes
   - Sandals
   - Canvas Shoes

### Product Features
Each product includes:
- **Realistic Pricing** - INR prices typical for Indian e-commerce
- **Discount Information** - Percentage-based discounts (automatically calculated)
- **Size & Color Variants** - Multiple options for customer selection
- **Stock Management** - Random quantities between 20-70 units
- **Product Images** - Placeholder URLs for testing
- **Brand Information** - Realistic Indian/International brands
- **Product Tags** - For search and filtering
- **Featured Status** - Some products marked as featured

### Orders
20 sample orders with:
- **Varied Statuses:**
  - Pending
  - Confirmed
  - Processing
  - Shipped
  - Delivered
  - Cancelled
- **Multiple Payment Methods:**
  - COD (Cash on Delivery)
  - Card
  - UPI
  - Wallet
- **Complete Order Details:**
  - Shipping addresses (across major Indian cities)
  - Order items with product references
  - Payment status tracking
  - Order history/status timeline
  - Discounts and taxes calculated
- **Date Variation** - Orders spread across the last 30 days

### Indian Cities & Locations

The seed data includes realistic addresses from major Indian cities:
- Delhi
- Mumbai
- Bangalore
- Ahmedabad
- Hyderabad
- Pune
- Kolkata
- Kochi
- Jaipur
- Chennai

## Database Collections Modified

The script will clear and recreate these MongoDB collections:

1. **Users** - User accounts and authentication data
2. **Categories** - Product categories
3. **Products** - Product listings with variants
4. **Orders** - Customer orders and transactions

## Error Handling

### Common Issues

#### MongoDB Connection Failed
```
Error: MongoDB connection refused
```
**Solution:** Ensure MongoDB is running on your system or connection string is correct in `.env` file.

#### Permission Denied
```
EACCES: permission denied
```
**Solution:** Check file permissions or try running with appropriate user permissions.

#### User Cancelled Seeding
```
Seeding cancelled
```
**Message appears when user enters anything other than 'yes' or 'y' at the confirmation prompt.**

## Output Example

```
--- Connecting to MongoDB ---
Connected to MongoDB successfully

This will clear all existing data and seed the database with sample data. Continue? (yes/no): yes

--- Clearing Existing Data ---
Cleared 13 User records
Cleared 5 Category records
Cleared 50 Product records
Cleared 20 Order records
Data cleared successfully

--- Creating Sample Users ---
Created 13 users:
  - 1 superadmin (superadmin@ecom.com)
  - 2 admins (admin1@ecom.com, admin2@ecom.com)
  - 10 regular users

--- Creating Sample Categories ---
Created 5 categories:
  - Men's Clothing
  - Women's Clothing
  - Electronics
  - Accessories
  - Shoes

--- Creating Sample Products ---
Created 50 products

Product distribution:
  - 7 Men's Clothing products
  - 7 Women's Clothing products
  - 5 Electronics products
  - 5 Accessories products
  - 5 Shoes products

--- Creating Sample Orders ---
Created 20 sample orders

--- Seeding Complete ---

Database Summary:
  Total Users: 13
  Total Categories: 5
  Total Products: 50
  Total Orders: 20

Test Credentials:
  Superadmin: superadmin@ecom.com / Super@123
  Admin 1: admin1@ecom.com / Admin@123
  Admin 2: admin2@ecom.com / Admin@123
  Regular User: rahul.sharma@mail.com / User@1234

MongoDB connection closed
```

## Advanced Usage

### Modifying Seed Data

To customize the seed data:

1. **Edit User Data** - Modify `sampleUsers` array or `regularUsersData` array
2. **Edit Categories** - Modify `sampleCategories` array
3. **Edit Products** - Modify product generation functions (menClothingProducts, womenClothingProducts, etc.)
4. **Edit Orders** - Modify `generateOrders` function

### Example: Adding Custom Category

```javascript
const sampleCategories = [
  // ... existing categories
  {
    name: "Home & Kitchen",
    description: 'Kitchen appliances and home decor items',
    image: 'https://via.placeholder.com/300x300?text=Home',
    order: 6
  }
];
```

## Performance Considerations

- **Execution Time:** Typically 2-5 seconds depending on MongoDB performance
- **Database Size:** Creates approximately 5-10 MB of test data
- **Network:** Requires stable connection to MongoDB
- **System Resources:** Minimal requirements (< 100 MB RAM usage)

## Best Practices

1. **Development Only** - Use this script only in development environments
2. **Backup First** - Back up your database before running if it contains important data
3. **Review Data** - Verify the generated data matches your requirements
4. **Fresh Start** - Run the script when starting fresh development sessions
5. **Production Safety** - Never connect to production database with this script

## Troubleshooting

### Script Hangs at Confirmation
- Ensure you can type in the terminal
- Check for any network connectivity issues
- Verify Node.js has access to stdin/stdout

### MongoDB Connection Issues
- Check MongoDB service is running: `mongod`
- Verify connection string in `.env` file
- Ensure correct host/port and credentials

### Import/Module Errors
- Verify all model files exist in `/models` directory
- Check that relative import paths are correct
- Ensure Node.js ES6 modules are enabled (check `package.json` type: "module")

### Incomplete Data
- If script exits prematurely, check error messages
- Verify sufficient disk space on MongoDB storage
- Check MongoDB user has write permissions

## Script Structure

### Key Functions

1. **askForConfirmation()** - User confirmation before destructive operations
2. **clearData()** - Safely removes all existing data
3. **generateRegularUsers()** - Creates 10 regular user accounts
4. **generateProducts()** - Creates 50 realistic products across categories
5. **generateOrders()** - Creates 20 sample orders with varied statuses
6. **seedDatabase()** - Main orchestration function

### Models Used

- **User Model** - User accounts with addresses and roles
- **Category Model** - Product categories with metadata
- **Product Model** - Products with colors, sizes, stock, reviews
- **Order Model** - Orders with items, payment info, shipping details

## Extensions

### Adding More Products

```javascript
const newProduct = {
  name: 'Your Product',
  description: 'Product description',
  brand: 'Brand Name',
  category: categories[0]._id,
  price: 999,
  discountPrice: 699,
  // ... other fields
};
```

### Custom User Roles

The script supports three role types:
- `superadmin` - Full system access
- `admin` - Administrative access
- `user` - Regular customer account

Modify the user role in seed data if needed.

## Related Documentation

- MongoDB: https://docs.mongodb.com/
- Mongoose: https://mongoosejs.com/docs/
- Node.js: https://nodejs.org/docs/

## Support

For issues or questions about the seed script:

1. Check the error messages carefully
2. Review this documentation
3. Verify MongoDB connectivity
4. Check Node.js version compatibility
5. Review server logs for additional details

## Version

- **Script Version:** 1.0.0
- **Last Updated:** January 2025
- **Compatibility:** Node.js 14+, MongoDB 4.0+
