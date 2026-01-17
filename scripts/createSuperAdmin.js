import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// User Schema (simplified for this script)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createSuperAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    // Check if superadmin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });

    if (existingSuperAdmin) {
      console.log('Superadmin already exists:');
      console.log(`  Email: ${existingSuperAdmin.email}`);
      console.log(`  Name: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      process.exit(0);
    }

    // Create new superadmin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const superAdmin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@admin.com',
      password: hashedPassword,
      role: 'superadmin',
      isActive: true
    });

    console.log('\n✅ Superadmin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Login Credentials:');
    console.log(`  Email: ${superAdmin.email}`);
    console.log('  Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
