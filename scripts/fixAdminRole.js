import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const fixAdminRole = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...');

    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@stylehub.com' });

    if (!adminUser) {
      console.log('Admin user not found!');
      process.exit(1);
    }

    console.log('\nBefore update:');
    console.log('Email:', adminUser.email);
    console.log('Current Role:', adminUser.role);

    // Update the role to admin
    adminUser.role = 'admin';
    await adminUser.save();

    console.log('\nAfter update:');
    console.log('Email:', adminUser.email);
    console.log('New Role:', adminUser.role);
    console.log('\n✅ Admin role updated successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixAdminRole();
