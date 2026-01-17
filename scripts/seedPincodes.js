import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import Pincode model
import Pincode from '../models/Pincode.js';

// Sample pincode data for major Indian cities
const pincodeData = [
  // Mumbai - Metro
  { pincode: '400001', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '400002', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '400003', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '400004', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '400005', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '400050', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '400051', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '400080', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', deliveryZone: 'semi-urban', min: 3, max: 5 },

  // Delhi - Metro
  { pincode: '110001', city: 'Delhi', district: 'New Delhi', state: 'Delhi', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '110002', city: 'Delhi', district: 'New Delhi', state: 'Delhi', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '110003', city: 'Delhi', district: 'New Delhi', state: 'Delhi', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '110011', city: 'Delhi', district: 'New Delhi', state: 'Delhi', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '110016', city: 'Delhi', district: 'New Delhi', state: 'Delhi', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '110025', city: 'Delhi', district: 'East Delhi', state: 'Delhi', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '110034', city: 'Delhi', district: 'South Delhi', state: 'Delhi', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '110041', city: 'Delhi', district: 'South Delhi', state: 'Delhi', deliveryZone: 'semi-urban', min: 3, max: 4 },

  // Bangalore - Metro
  { pincode: '560001', city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '560002', city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '560004', city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '560009', city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '560034', city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '560070', city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '560100', city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka', deliveryZone: 'semi-urban', min: 3, max: 4 },

  // Hyderabad - Metro
  { pincode: '500001', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '500002', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '500003', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '500007', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '500033', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '500034', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '500090', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', deliveryZone: 'semi-urban', min: 3, max: 4 },

  // Chennai - Metro
  { pincode: '600001', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '600002', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '600004', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '600006', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '600026', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '600042', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '600091', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', deliveryZone: 'semi-urban', min: 3, max: 4 },

  // Kolkata - Metro
  { pincode: '700001', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '700006', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '700007', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '700017', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '700025', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '700064', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '700136', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', deliveryZone: 'semi-urban', min: 3, max: 4 },

  // Pune - Urban
  { pincode: '411001', city: 'Pune', district: 'Pune', state: 'Maharashtra', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '411002', city: 'Pune', district: 'Pune', state: 'Maharashtra', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '411005', city: 'Pune', district: 'Pune', state: 'Maharashtra', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '411038', city: 'Pune', district: 'Pune', state: 'Maharashtra', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '411048', city: 'Pune', district: 'Pune', state: 'Maharashtra', deliveryZone: 'semi-urban', min: 3, max: 5 },

  // Ahmedabad - Urban
  { pincode: '380001', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '380006', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '380009', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '380015', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '380058', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', deliveryZone: 'semi-urban', min: 3, max: 5 },

  // Jaipur - Urban
  { pincode: '302001', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '302002', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', deliveryZone: 'metro', min: 1, max: 2 },
  { pincode: '302012', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '302015', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '302021', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', deliveryZone: 'semi-urban', min: 3, max: 5 },

  // Lucknow - Urban
  { pincode: '226001', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '226002', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', deliveryZone: 'urban', min: 2, max: 3 },
  { pincode: '226010', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', deliveryZone: 'semi-urban', min: 3, max: 5 },
];

async function seedPincodes() {
  let successCount = 0;
  let failureCount = 0;
  let duplicateCount = 0;

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');
    console.log('\n' + '━'.repeat(60));
    console.log('Starting Pincode Data Seeding');
    console.log('━'.repeat(60) + '\n');

    // Process each pincode
    for (const data of pincodeData) {
      try {
        // Check if pincode already exists
        const existingPincode = await Pincode.findOne({ pincode: data.pincode });

        if (existingPincode) {
          console.log(`⊘ [DUPLICATE] Pincode ${data.pincode} (${data.city}) already exists, skipping...`);
          duplicateCount++;
          continue;
        }

        // Create new pincode document
        const newPincode = await Pincode.create({
          pincode: data.pincode,
          city: data.city,
          district: data.district,
          state: data.state,
          country: 'India',
          deliveryZone: data.deliveryZone,
          isServiceable: true,
          codAvailable: true,
          estimatedDeliveryDays: {
            min: data.min,
            max: data.max,
          },
          shippingPartners: ['delhivery', 'bluedart', 'dtdc', 'ekart', 'shadowfax'],
          surchargePercentage: data.deliveryZone === 'semi-urban' ? 5 : 0,
          isActive: true,
        });

        console.log(`✓ [SUCCESS] Pincode ${newPincode.pincode} (${newPincode.city}, ${newPincode.deliveryZone}) created`);
        successCount++;
      } catch (error) {
        console.error(`✗ [ERROR] Failed to create pincode ${data.pincode}: ${error.message}`);
        failureCount++;
      }
    }

    // Print summary
    console.log('\n' + '━'.repeat(60));
    console.log('Seeding Summary');
    console.log('━'.repeat(60));
    console.log(`Total Records Processed: ${pincodeData.length}`);
    console.log(`✓ Successfully Created: ${successCount}`);
    console.log(`⊘ Duplicates Skipped: ${duplicateCount}`);
    console.log(`✗ Failed: ${failureCount}`);
    console.log('━'.repeat(60) + '\n');

    if (failureCount === 0 && successCount > 0) {
      console.log('All pincodes seeded successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error during seeding:', error.message);
    process.exit(1);
  }
}

// Run the seed function
seedPincodes();
