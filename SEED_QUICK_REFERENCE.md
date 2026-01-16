# Seed Script Quick Reference

## Quick Start

```bash
# Run the seed script
npm run seed

# When prompted, type 'yes' or 'y' to confirm
```

## Test Credentials (After Seeding)

| Role | Email | Password |
|------|-------|----------|
| Superadmin | superadmin@ecom.com | Super@123 |
| Admin 1 | admin1@ecom.com | Admin@123 |
| Admin 2 | admin2@ecom.com | Admin@123 |
| User | rahul.sharma@mail.com | User@1234 |

## What Gets Created

| Entity | Count | Details |
|--------|-------|---------|
| Users | 13 | 1 superadmin, 2 admins, 10 regular users |
| Categories | 5 | Men's, Women's, Electronics, Accessories, Shoes |
| Products | 50 | 7-7-5-5-5 distribution across categories |
| Orders | 20 | Mixed statuses: pending, shipped, delivered, etc. |

## Product Inventory

### Men's Clothing (7)
- Premium Cotton T-Shirt (499/349)
- Classic Denim Jeans (1299/899)
- Formal Shirt (899/649)
- Leather Jacket (4999/3499)
- Casual Shorts (599/399)
- Sports Hoodie (1099/749)
- Polo Shirt (799/499)

### Women's Clothing (7)
- Casual Kurti (699/449)
- Cotton Saree (1299/899)
- Casual Dress (999/649)
- Leggings Set (499/299)
- Top & Bottom Combo (899/599)
- Blazer (1799/1199)
- Anarkali Suit (2499/1799)

### Electronics (5)
- Wireless Earbuds (2999/1999)
- USB-C Charging Cable (499/299)
- Power Bank 20000mAh (1899/1299)
- Screen Protector (299/149)
- Bluetooth Speaker (1499/999)

### Accessories (5)
- Leather Wallet (1299/799)
- Analog Wristwatch (2499/1699)
- Canvas Backpack (1699/1099)
- Sunglasses (1299/799)
- Silk Scarf (899/599)

### Shoes (5)
- Casual Sneakers (1999/1299)
- Formal Shoes (2499/1699)
- Sports Shoes (2299/1499)
- Sandals (699/399)
- Canvas Shoes (1299/799)

*Price format: Original/Discount*

## User Accounts (Regular Users)

1. rahul.sharma@mail.com - Delhi
2. priya.singh@mail.com - Mumbai
3. amit.patel@mail.com - Ahmedabad
4. neha.kumar@mail.com - Bangalore
5. arjun.verma@mail.com - Hyderabad
6. isha.gupta@mail.com - Pune
7. rohan.joshi@mail.com - Kolkata
8. anjali.nair@mail.com - Kochi
9. vikram.singh@mail.com - Jaipur
10. divya.reddy@mail.com - Chennai

*All regular users use password: User@1234*

## Order Statistics

- **Statuses**: Pending, Confirmed, Processing, Shipped, Delivered, Cancelled
- **Payment Methods**: COD, Card, UPI, Wallet
- **Date Range**: Last 30 days
- **Average Items/Order**: 1-3 items
- **Shipping**: Free if order > 500 INR, else 99 INR

## Categories Coverage

| Category | Products | Price Range |
|----------|----------|------------|
| Men's Clothing | 7 | 399-3499 |
| Women's Clothing | 7 | 299-1799 |
| Electronics | 5 | 149-1999 |
| Accessories | 5 | 599-1699 |
| Shoes | 5 | 399-1699 |

## File Locations

- **Seed Script**: `/backend/scripts/seed.js`
- **Documentation**: `/backend/SEED_SCRIPT_README.md`
- **Package Config**: `/backend/package.json`

## Npm Scripts

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
npm run seed     # Run database seed script
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection error | Verify MongoDB is running and connection string in .env |
| Permission denied | Check file permissions or run with proper user |
| Script hangs | Verify terminal can accept input |
| Incomplete data | Check disk space and MongoDB write permissions |

## Features Included

✓ Realistic Indian e-commerce data
✓ Multiple product categories
✓ Variant support (colors, sizes)
✓ Discount calculations
✓ Stock management
✓ Order history with statuses
✓ Multiple user roles
✓ Address data for Indian cities
✓ Payment method variations
✓ Tax and shipping calculations
✓ User confirmation prompt
✓ Error handling

## Commands Summary

```bash
# Navigate to backend directory
cd /Users/yaswanthgandhi/Documents/validatesharing/backend

# Run seed script
npm run seed

# Start server after seeding
npm start

# Development mode with auto-reload
npm run dev
```

## Notes

- Passwords are automatically hashed using bcrypt
- Discount percentages are auto-calculated
- Order numbers are auto-generated unique IDs
- Timestamps are automatically added
- Image URLs are placeholders (change to real URLs as needed)
- All data is realistic for Indian market
