import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

dotenv.config();

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask for confirmation
const askForConfirmation = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
};

// Mock image URLs for products
const productImages = [
  'https://via.placeholder.com/500x500?text=Product+1',
  'https://via.placeholder.com/500x500?text=Product+2',
  'https://via.placeholder.com/500x500?text=Product+3',
  'https://via.placeholder.com/500x500?text=Product+4',
  'https://via.placeholder.com/500x500?text=Product+5'
];

// Sample data generators
const sampleUsers = [
  {
    email: 'superadmin@ecom.com',
    password: 'Super@123',
    firstName: 'Super',
    lastName: 'Admin',
    phone: '9876543210',
    role: 'superadmin',
    addresses: [{
      fullName: 'Super Admin',
      phone: '9876543210',
      type: 'Home',
      addressLine1: 'Superadmin Towers, Tech Park',
      addressLine2: 'Block 1, Floor 5',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India',
      isDefault: true
    }]
  },
  {
    email: 'admin1@ecom.com',
    password: 'Admin@123',
    firstName: 'Admin',
    lastName: 'One',
    phone: '9876543211',
    role: 'admin',
    addresses: [{
      fullName: 'Admin One',
      phone: '9876543211',
      type: 'Work',
      addressLine1: 'Admin Plaza, Business District',
      addressLine2: 'Suite 100',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India',
      isDefault: true
    }]
  },
  {
    email: 'admin2@ecom.com',
    password: 'Admin@123',
    firstName: 'Admin',
    lastName: 'Two',
    phone: '9876543212',
    role: 'admin',
    addresses: [{
      fullName: 'Admin Two',
      phone: '9876543212',
      type: 'Home',
      addressLine1: 'Admin Gardens, IT Zone',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India',
      isDefault: true
    }]
  }
];

// Regular users with Indian names
const regularUsersData = [
  { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.sharma@mail.com', phone: '9000000001', city: 'Delhi', state: 'Delhi', pincode: '110001' },
  { firstName: 'Priya', lastName: 'Singh', email: 'priya.singh@mail.com', phone: '9000000002', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { firstName: 'Amit', lastName: 'Patel', email: 'amit.patel@mail.com', phone: '9000000003', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  { firstName: 'Neha', lastName: 'Kumar', email: 'neha.kumar@mail.com', phone: '9000000004', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
  { firstName: 'Arjun', lastName: 'Verma', email: 'arjun.verma@mail.com', phone: '9000000005', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  { firstName: 'Isha', lastName: 'Gupta', email: 'isha.gupta@mail.com', phone: '9000000006', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
  { firstName: 'Rohan', lastName: 'Joshi', email: 'rohan.joshi@mail.com', phone: '9000000007', city: 'Kolkata', state: 'West Bengal', pincode: '700001' },
  { firstName: 'Anjali', lastName: 'Nair', email: 'anjali.nair@mail.com', phone: '9000000008', city: 'Kochi', state: 'Kerala', pincode: '682001' },
  { firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@mail.com', phone: '9000000009', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  { firstName: 'Divya', lastName: 'Reddy', email: 'divya.reddy@mail.com', phone: '9000000010', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }
];

const generateRegularUsers = () => {
  return regularUsersData.map(user => ({
    ...user,
    password: 'User@1234',
    role: 'user',
    addresses: [{
      fullName: `${user.firstName} ${user.lastName}`,
      phone: user.phone,
      type: 'Home',
      addressLine1: `${Math.floor(Math.random() * 1000)} Main Street`,
      addressLine2: 'Apt ' + (Math.floor(Math.random() * 100) + 1),
      city: user.city,
      state: user.state,
      zipCode: user.pincode,
      country: 'India',
      isDefault: true
    }]
  }));
};

const sampleCategories = [
  {
    name: 'Women',
    description: 'Stylish womens apparel including dresses, tops, sarees, kurtas and ethnic wear',
    image: 'https://via.placeholder.com/300x300?text=Women',
    order: 1
  },
  {
    name: 'Men',
    description: 'Latest trends in mens fashion including shirts, pants, t-shirts, jeans and formal wear',
    image: 'https://via.placeholder.com/300x300?text=Men',
    order: 2
  },
  {
    name: 'Kids',
    description: 'Fun and comfortable clothing for boys and girls of all ages',
    image: 'https://via.placeholder.com/300x300?text=Kids',
    order: 3
  },
  {
    name: 'Accessories',
    description: 'Premium accessories including bags, belts, watches, jewelry and sunglasses',
    image: 'https://via.placeholder.com/300x300?text=Accessories',
    order: 4
  },
  {
    name: 'Footwear',
    description: 'Trendy footwear collection including shoes, sandals, heels and sneakers',
    image: 'https://via.placeholder.com/300x300?text=Footwear',
    order: 5
  }
];

// Sample products with realistic Indian e-commerce data
const generateProducts = (categories, createdByUserId) => {
  const products = [];

  const menClothingProducts = [
    {
      name: 'Premium Cotton T-Shirt',
      description: 'High quality cotton t-shirt perfect for casual wear. Soft, breathable fabric with comfortable fit.',
      brand: 'StyleWear',
      category: categories[0]._id,
      price: 499,
      discountPrice: 349,
      images: [productImages[0], productImages[1]],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: [
        { name: 'White', hexCode: '#FFFFFF', images: [productImages[0]] },
        { name: 'Black', hexCode: '#000000', images: [productImages[1]] },
        { name: 'Blue', hexCode: '#0000FF', images: [productImages[2]] }
      ],
      tags: ['mens', 'casual', 'cotton', 'summer'],
      isFeatured: true
    },
    {
      name: 'Classic Denim Jeans',
      description: 'Durable and comfortable denim jeans suitable for everyday wear with excellent fit and finish.',
      brand: 'DenimCo',
      category: categories[0]._id,
      price: 1299,
      discountPrice: 899,
      images: [productImages[3], productImages[4]],
      sizes: ['28', '30', '32', '34', '36', '38'],
      colors: [
        { name: 'Light Blue', hexCode: '#ADD8E6', images: [productImages[3]] },
        { name: 'Dark Blue', hexCode: '#00008B', images: [productImages[4]] },
        { name: 'Black', hexCode: '#000000', images: [productImages[0]] }
      ],
      tags: ['mens', 'jeans', 'casual', 'durable'],
      isFeatured: true
    },
    {
      name: 'Formal Shirt',
      description: 'Elegant formal shirt perfect for office and special occasions. Premium fabric with fine stitching.',
      brand: 'FormalWear',
      category: categories[0]._id,
      price: 899,
      discountPrice: 649,
      images: [productImages[1], productImages[2]],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: [
        { name: 'White', hexCode: '#FFFFFF', images: [productImages[1]] },
        { name: 'Light Blue', hexCode: '#ADD8E6', images: [productImages[2]] },
        { name: 'Pink', hexCode: '#FFC0CB', images: [productImages[0]] }
      ],
      tags: ['mens', 'formal', 'office', 'shirt'],
      isFeatured: false
    },
    {
      name: 'Leather Jacket',
      description: 'Premium genuine leather jacket with perfect finish. Ideal for winter and special occasions.',
      brand: 'StyleWear',
      category: categories[0]._id,
      price: 4999,
      discountPrice: 3499,
      images: [productImages[4], productImages[0]],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[4]] },
        { name: 'Brown', hexCode: '#8B4513', images: [productImages[0]] }
      ],
      tags: ['mens', 'jacket', 'leather', 'premium', 'winter'],
      isFeatured: true
    },
    {
      name: 'Casual Shorts',
      description: 'Comfortable and stylish shorts perfect for summer and casual outings.',
      brand: 'ComfortWear',
      category: categories[0]._id,
      price: 599,
      discountPrice: 399,
      images: [productImages[2], productImages[3]],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [
        { name: 'Khaki', hexCode: '#F0E68C', images: [productImages[2]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[3]] }
      ],
      tags: ['mens', 'shorts', 'casual', 'summer'],
      isFeatured: false
    },
    {
      name: 'Sports Hoodie',
      description: 'Comfortable sports hoodie with good fabric quality. Ideal for workout and casual wear.',
      brand: 'SportStyle',
      category: categories[0]._id,
      price: 1099,
      discountPrice: 749,
      images: [productImages[0], productImages[1]],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: [
        { name: 'Grey', hexCode: '#808080', images: [productImages[0]] },
        { name: 'Black', hexCode: '#000000', images: [productImages[1]] },
        { name: 'Blue', hexCode: '#0000FF', images: [productImages[2]] }
      ],
      tags: ['mens', 'hoodie', 'sports', 'casual'],
      isFeatured: false
    },
    {
      name: 'Polo Shirt',
      description: 'Classic polo shirt suitable for both casual and semi-formal occasions. Premium quality material.',
      brand: 'ClassicWear',
      category: categories[0]._id,
      price: 799,
      discountPrice: 499,
      images: [productImages[3], productImages[4]],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: [
        { name: 'White', hexCode: '#FFFFFF', images: [productImages[3]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[4]] },
        { name: 'Green', hexCode: '#008000', images: [productImages[0]] }
      ],
      tags: ['mens', 'polo', 'casual', 'semi-formal'],
      isFeatured: true
    }
  ];

  const womenClothingProducts = [
    {
      name: 'Casual Kurti',
      description: 'Traditional and comfortable kurti with modern design. Perfect for daily wear and casual outings.',
      brand: 'EthnicWear',
      category: categories[1]._id,
      price: 699,
      discountPrice: 449,
      images: [productImages[1], productImages[2]],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: [
        { name: 'Red', hexCode: '#FF0000', images: [productImages[1]] },
        { name: 'Blue', hexCode: '#0000FF', images: [productImages[2]] },
        { name: 'Green', hexCode: '#008000', images: [productImages[0]] }
      ],
      tags: ['womens', 'kurti', 'ethnic', 'casual'],
      isFeatured: true
    },
    {
      name: 'Cotton Saree',
      description: 'Beautiful cotton saree with traditional prints. Comfortable and elegant for all occasions.',
      brand: 'TraditionalWear',
      category: categories[1]._id,
      price: 1299,
      discountPrice: 899,
      images: [productImages[3], productImages[4]],
      sizes: ['Free Size'],
      colors: [
        { name: 'Maroon', hexCode: '#800000', images: [productImages[3]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[4]] },
        { name: 'Green', hexCode: '#008000', images: [productImages[1]] }
      ],
      tags: ['womens', 'saree', 'cotton', 'traditional'],
      isFeatured: true
    },
    {
      name: 'Casual Dress',
      description: 'Trendy casual dress suitable for parties and outings. Comfortable fabric with stylish design.',
      brand: 'StyleWear',
      category: categories[1]._id,
      price: 999,
      discountPrice: 649,
      images: [productImages[0], productImages[1]],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[0]] },
        { name: 'Red', hexCode: '#FF0000', images: [productImages[1]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[2]] }
      ],
      tags: ['womens', 'dress', 'casual', 'party'],
      isFeatured: true
    },
    {
      name: 'Leggings Set',
      description: 'Comfortable and stretchable leggings perfect for casual wear and workouts.',
      brand: 'ComfortWear',
      category: categories[1]._id,
      price: 499,
      discountPrice: 299,
      images: [productImages[2], productImages[3]],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[2]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[3]] },
        { name: 'Grey', hexCode: '#808080', images: [productImages[0]] }
      ],
      tags: ['womens', 'leggings', 'casual', 'comfortable'],
      isFeatured: false
    },
    {
      name: 'Top & Bottom Combo',
      description: 'Stylish combo set with matching top and bottom. Great value for money.',
      brand: 'StyleWear',
      category: categories[1]._id,
      price: 899,
      discountPrice: 599,
      images: [productImages[4], productImages[0]],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: [
        { name: 'Pink', hexCode: '#FFC0CB', images: [productImages[4]] },
        { name: 'Purple', hexCode: '#800080', images: [productImages[0]] }
      ],
      tags: ['womens', 'combo', 'casual', 'affordable'],
      isFeatured: false
    },
    {
      name: 'Blazer',
      description: 'Professional blazer suitable for office and formal occasions. Perfect fit with quality fabric.',
      brand: 'FormalWear',
      category: categories[1]._id,
      price: 1799,
      discountPrice: 1199,
      images: [productImages[1], productImages[2]],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[1]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[2]] },
        { name: 'Grey', hexCode: '#808080', images: [productImages[3]] }
      ],
      tags: ['womens', 'blazer', 'formal', 'office'],
      isFeatured: true
    },
    {
      name: 'Anarkali Suit',
      description: 'Traditional anarkali suit with elegant embroidery. Perfect for festivals and celebrations.',
      brand: 'EthnicWear',
      category: categories[1]._id,
      price: 2499,
      discountPrice: 1799,
      images: [productImages[3], productImages[4]],
      sizes: ['Free Size'],
      colors: [
        { name: 'Red', hexCode: '#FF0000', images: [productImages[3]] },
        { name: 'Blue', hexCode: '#0000FF', images: [productImages[4]] },
        { name: 'Green', hexCode: '#008000', images: [productImages[0]] }
      ],
      tags: ['womens', 'anarkali', 'traditional', 'festival'],
      isFeatured: true
    }
  ];

  const electronicsProducts = [
    {
      name: 'Wireless Earbuds',
      description: 'Premium wireless earbuds with noise cancellation and 24-hour battery life.',
      brand: 'TechAudio',
      category: categories[2]._id,
      price: 2999,
      discountPrice: 1999,
      images: [productImages[0], productImages[1]],
      sizes: ['One Size'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[0]] },
        { name: 'White', hexCode: '#FFFFFF', images: [productImages[1]] }
      ],
      tags: ['electronics', 'earbuds', 'wireless', 'tech'],
      isFeatured: true
    },
    {
      name: 'USB-C Charging Cable',
      description: 'Durable USB-C charging cable with fast charging support and premium build quality.',
      brand: 'TechCables',
      category: categories[2]._id,
      price: 499,
      discountPrice: 299,
      images: [productImages[2], productImages[3]],
      sizes: ['1m', '2m'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[2]] },
        { name: 'White', hexCode: '#FFFFFF', images: [productImages[3]] }
      ],
      tags: ['electronics', 'cable', 'charging', 'usb-c'],
      isFeatured: false
    },
    {
      name: 'Power Bank 20000mAh',
      description: 'High capacity power bank with fast charging for all devices. Compact and portable design.',
      brand: 'PowerTech',
      category: categories[2]._id,
      price: 1899,
      discountPrice: 1299,
      images: [productImages[4], productImages[0]],
      sizes: ['One Size'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[4]] },
        { name: 'Silver', hexCode: '#C0C0C0', images: [productImages[0]] },
        { name: 'Blue', hexCode: '#0000FF', images: [productImages[1]] }
      ],
      tags: ['electronics', 'powerbank', 'charging', 'portable'],
      isFeatured: true
    },
    {
      name: 'Screen Protector',
      description: 'Tempered glass screen protector with 9H hardness rating. Anti-glare and bubble-free installation.',
      brand: 'ScreenGuard',
      category: categories[2]._id,
      price: 299,
      discountPrice: 149,
      images: [productImages[1], productImages[2]],
      sizes: ['Pack of 2', 'Pack of 5'],
      colors: [
        { name: 'Clear', hexCode: '#FFFFFF', images: [productImages[1]] }
      ],
      tags: ['electronics', 'protector', 'screen', 'glass'],
      isFeatured: false
    },
    {
      name: 'Bluetooth Speaker',
      description: 'Portable Bluetooth speaker with powerful bass and 12-hour battery life. IPX5 waterproof.',
      brand: 'SoundMax',
      category: categories[2]._id,
      price: 1499,
      discountPrice: 999,
      images: [productImages[3], productImages[4]],
      sizes: ['One Size'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[3]] },
        { name: 'Blue', hexCode: '#0000FF', images: [productImages[4]] },
        { name: 'Red', hexCode: '#FF0000', images: [productImages[0]] }
      ],
      tags: ['electronics', 'speaker', 'bluetooth', 'portable'],
      isFeatured: true
    }
  ];

  const accessoriesProducts = [
    {
      name: 'Leather Wallet',
      description: 'Premium leather wallet with multiple card slots and coin compartment. Long-lasting quality.',
      brand: 'LeatherCraft',
      category: categories[3]._id,
      price: 1299,
      discountPrice: 799,
      images: [productImages[0], productImages[1]],
      sizes: ['One Size'],
      colors: [
        { name: 'Brown', hexCode: '#8B4513', images: [productImages[0]] },
        { name: 'Black', hexCode: '#000000', images: [productImages[1]] },
        { name: 'Tan', hexCode: '#D2B48C', images: [productImages[2]] }
      ],
      tags: ['accessories', 'wallet', 'leather', 'men'],
      isFeatured: true
    },
    {
      name: 'Analog Wristwatch',
      description: 'Stylish analog wristwatch with stainless steel case. Water-resistant and durable.',
      brand: 'TimeStyle',
      category: categories[3]._id,
      price: 2499,
      discountPrice: 1699,
      images: [productImages[2], productImages[3]],
      sizes: ['One Size'],
      colors: [
        { name: 'Silver', hexCode: '#C0C0C0', images: [productImages[2]] },
        { name: 'Gold', hexCode: '#FFD700', images: [productImages[3]] },
        { name: 'Rose Gold', hexCode: '#B76E79', images: [productImages[4]] }
      ],
      tags: ['accessories', 'watch', 'analog', 'formal'],
      isFeatured: true
    },
    {
      name: 'Canvas Backpack',
      description: 'Durable canvas backpack with multiple compartments. Suitable for travel and daily use.',
      brand: 'TravelGear',
      category: categories[3]._id,
      price: 1699,
      discountPrice: 1099,
      images: [productImages[4], productImages[0]],
      sizes: ['25L', '30L'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[4]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[0]] },
        { name: 'Khaki', hexCode: '#F0E68C', images: [productImages[1]] }
      ],
      tags: ['accessories', 'backpack', 'travel', 'canvas'],
      isFeatured: true
    },
    {
      name: 'Sunglasses',
      description: 'UV-protected sunglasses with premium quality lenses. Stylish frames suitable for all face shapes.',
      brand: 'StyleShades',
      category: categories[3]._id,
      price: 1299,
      discountPrice: 799,
      images: [productImages[1], productImages[2]],
      sizes: ['One Size'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[1]] },
        { name: 'Brown', hexCode: '#8B4513', images: [productImages[2]] }
      ],
      tags: ['accessories', 'sunglasses', 'uv-protection', 'style'],
      isFeatured: false
    },
    {
      name: 'Silk Scarf',
      description: 'Premium silk scarf with elegant patterns. Perfect for formal occasions and daily wear.',
      brand: 'SilkWear',
      category: categories[3]._id,
      price: 899,
      discountPrice: 599,
      images: [productImages[3], productImages[4]],
      sizes: ['One Size'],
      colors: [
        { name: 'Maroon', hexCode: '#800000', images: [productImages[3]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[4]] },
        { name: 'Cream', hexCode: '#FFFDD0', images: [productImages[0]] }
      ],
      tags: ['accessories', 'scarf', 'silk', 'women'],
      isFeatured: true
    }
  ];

  const shoesProducts = [
    {
      name: 'Casual Sneakers',
      description: 'Comfortable and stylish casual sneakers perfect for everyday wear. Premium cushioning and support.',
      brand: 'FootStyle',
      category: categories[4]._id,
      price: 1999,
      discountPrice: 1299,
      images: [productImages[0], productImages[1]],
      sizes: ['6', '7', '8', '9', '10', '11', '12'],
      colors: [
        { name: 'White', hexCode: '#FFFFFF', images: [productImages[0]] },
        { name: 'Black', hexCode: '#000000', images: [productImages[1]] },
        { name: 'Grey', hexCode: '#808080', images: [productImages[2]] }
      ],
      tags: ['shoes', 'sneakers', 'casual', 'comfort'],
      isFeatured: true
    },
    {
      name: 'Formal Shoes',
      description: 'Elegant formal shoes perfect for office and formal occasions. Premium leather construction.',
      brand: 'FormalFeet',
      category: categories[4]._id,
      price: 2499,
      discountPrice: 1699,
      images: [productImages[2], productImages[3]],
      sizes: ['6', '7', '8', '9', '10', '11', '12'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[2]] },
        { name: 'Brown', hexCode: '#8B4513', images: [productImages[3]] }
      ],
      tags: ['shoes', 'formal', 'leather', 'office'],
      isFeatured: true
    },
    {
      name: 'Sports Shoes',
      description: 'High-performance sports shoes with excellent grip and cushioning. Suitable for running and sports.',
      brand: 'SportFoot',
      category: categories[4]._id,
      price: 2299,
      discountPrice: 1499,
      images: [productImages[3], productImages[4]],
      sizes: ['6', '7', '8', '9', '10', '11', '12'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[3]] },
        { name: 'Blue', hexCode: '#0000FF', images: [productImages[4]] },
        { name: 'Red', hexCode: '#FF0000', images: [productImages[0]] }
      ],
      tags: ['shoes', 'sports', 'running', 'athletic'],
      isFeatured: true
    },
    {
      name: 'Sandals',
      description: 'Comfortable and stylish sandals for casual wear and summer. Lightweight and breathable.',
      brand: 'ComfortStep',
      category: categories[4]._id,
      price: 699,
      discountPrice: 399,
      images: [productImages[4], productImages[0]],
      sizes: ['6', '7', '8', '9', '10', '11', '12'],
      colors: [
        { name: 'Black', hexCode: '#000000', images: [productImages[4]] },
        { name: 'Brown', hexCode: '#8B4513', images: [productImages[0]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[1]] }
      ],
      tags: ['shoes', 'sandals', 'casual', 'summer'],
      isFeatured: false
    },
    {
      name: 'Canvas Shoes',
      description: 'Classic canvas shoes with excellent durability. Versatile for casual and semi-formal occasions.',
      brand: 'CanvasWalk',
      category: categories[4]._id,
      price: 1299,
      discountPrice: 799,
      images: [productImages[1], productImages[2]],
      sizes: ['6', '7', '8', '9', '10', '11', '12'],
      colors: [
        { name: 'White', hexCode: '#FFFFFF', images: [productImages[1]] },
        { name: 'Black', hexCode: '#000000', images: [productImages[2]] },
        { name: 'Navy', hexCode: '#000080', images: [productImages[3]] }
      ],
      tags: ['shoes', 'canvas', 'casual', 'versatile'],
      isFeatured: true
    }
  ];

  products.push(...menClothingProducts);
  products.push(...womenClothingProducts);
  products.push(...electronicsProducts);
  products.push(...accessoriesProducts);
  products.push(...shoesProducts);

  // Add stock data and createdBy to all products
  return products.map(product => ({
    ...product,
    stock: [
      ...product.sizes.map(size => ({
        size,
        color: product.colors[0].name,
        quantity: Math.floor(Math.random() * 50) + 20
      }))
    ],
    createdBy: createdByUserId
  }));
};

const generateOrders = (userIds, productIds) => {
  const orders = [];
  const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const paymentMethods = ['COD', 'Card', 'UPI', 'Wallet'];
  const indianStates = ['Delhi', 'Mumbai', 'Karnataka', 'Gujarat', 'Maharashtra', 'Rajasthan', 'Tamil Nadu'];
  const indianCities = {
    'Delhi': ['Delhi', 'New Delhi', 'Ghaziabad'],
    'Mumbai': ['Mumbai', 'Thane', 'Navi Mumbai'],
    'Karnataka': ['Bangalore', 'Mangalore', 'Mysore'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara'],
    'Maharashtra': ['Pune', 'Nagpur', 'Aurangabad'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai']
  };

  const firstNames = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rohan', 'Divya', 'Arjun', 'Neha'];
  const lastNames = ['Sharma', 'Singh', 'Patel', 'Kumar', 'Verma', 'Gupta', 'Joshi', 'Reddy', 'Nair', 'Desai'];

  for (let i = 0; i < 20; i++) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const state = indianStates[Math.floor(Math.random() * indianStates.length)];
    const city = indianCities[state][Math.floor(Math.random() * indianCities[state].length)];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let itemsTotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const productId = productIds[Math.floor(Math.random() * productIds.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const price = Math.floor(Math.random() * 2000) + 500;
      const discountPrice = Math.floor(price * 0.7);
      items.push({
        product: productId,
        name: `Product ${Math.floor(Math.random() * 1000)}`,
        image: productImages[Math.floor(Math.random() * productImages.length)],
        quantity,
        size: ['S', 'M', 'L', 'XL', 'One Size'][Math.floor(Math.random() * 5)],
        color: ['Black', 'White', 'Blue', 'Red', 'Navy'][Math.floor(Math.random() * 5)],
        price,
        discountPrice
      });
      itemsTotal += price * quantity;
    }

    const discount = Math.floor(itemsTotal * 0.1);
    const shippingCharge = itemsTotal > 500 ? 0 : 99;
    const tax = Math.floor((itemsTotal - discount) * 0.05);
    const totalAmount = itemsTotal - discount + shippingCharge + tax;

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    const order = {
      user: userId,
      items,
      shippingAddress: {
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
        addressLine1: `${Math.floor(Math.random() * 1000)} Main Street`,
        addressLine2: `Apt ${Math.floor(Math.random() * 100)}`,
        city,
        state,
        pincode: '10000' + i,
        country: 'India',
        phone: '900000000' + i
      },
      paymentMethod,
      paymentStatus: status === 'delivered' ? 'completed' : status === 'cancelled' ? 'failed' : 'pending',
      itemsTotal,
      discount,
      shippingCharge,
      tax,
      totalAmount,
      orderStatus: status,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
    };

    if (status === 'delivered') {
      order.paymentDetails = {
        transactionId: 'TXN' + Math.random().toString(36).substr(2, 9),
        paidAt: new Date(order.createdAt.getTime() + 24 * 60 * 60 * 1000)
      };
      order.deliveredAt = new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date(order.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000);
      order.cancellationReason = ['Customer request', 'Out of stock', 'Payment failed', 'Duplicate order'][Math.floor(Math.random() * 4)];
    }

    orders.push(order);
  }

  return orders;
};

// Clear all collections
const clearData = async () => {
  try {
    console.log('\n--- Clearing Existing Data ---');

    const collections = [
      { name: 'User', model: User },
      { name: 'Category', model: Category },
      { name: 'Product', model: Product },
      { name: 'Order', model: Order }
    ];

    for (const collection of collections) {
      const count = await collection.model.countDocuments();
      if (count > 0) {
        await collection.model.deleteMany({});
        console.log(`Cleared ${count} ${collection.name} records`);
      }
    }

    console.log('Data cleared successfully\n');
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};

// Seed database
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log('\n--- Connecting to MongoDB ---');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully\n');

    // Ask for confirmation
    const confirmed = await askForConfirmation(
      'This will clear all existing data and seed the database with sample data. Continue? (yes/no): '
    );
    rl.close();

    if (!confirmed) {
      console.log('Seeding cancelled');
      process.exit(0);
    }

    // Clear existing data
    await clearData();

    // Create Users
    console.log('--- Creating Sample Users ---');
    const usersToCreate = [...sampleUsers, ...generateRegularUsers()];
    const createdUsers = await User.create(usersToCreate);
    console.log(`Created ${createdUsers.length} users:`);
    console.log('  - 1 superadmin (superadmin@ecom.com)');
    console.log('  - 2 admins (admin1@ecom.com, admin2@ecom.com)');
    console.log('  - 10 regular users\n');

    // Create Categories
    console.log('--- Creating Sample Categories ---');
    const createdCategories = await Category.create(sampleCategories);
    console.log(`Created ${createdCategories.length} categories:\n`);
    createdCategories.forEach(cat => {
      console.log(`  - ${cat.name}`);
    });
    console.log();

    // Create Products
    console.log('--- Creating Sample Products ---');
    const adminUser = createdUsers.find(u => u.role === 'admin');
    const productsData = generateProducts(createdCategories, adminUser._id);
    const createdProducts = await Product.create(productsData);
    console.log(`Created ${createdProducts.length} products\n`);
    console.log('Product distribution:');
    console.log('  - 7 Men\'s Clothing products');
    console.log('  - 7 Women\'s Clothing products');
    console.log('  - 5 Electronics products');
    console.log('  - 5 Accessories products');
    console.log('  - 5 Shoes products\n');

    // Create Orders
    console.log('--- Creating Sample Orders ---');
    const userIds = createdUsers.filter(u => u.role === 'user').map(u => u._id);
    const productIds = createdProducts.map(p => p._id);
    const ordersData = generateOrders(userIds, productIds);
    const createdOrders = await Order.create(ordersData);
    console.log(`Created ${createdOrders.length} sample orders\n`);

    // Print summary
    console.log('--- Seeding Complete ---');
    console.log('\nDatabase Summary:');
    console.log(`  Total Users: ${createdUsers.length}`);
    console.log(`  Total Categories: ${createdCategories.length}`);
    console.log(`  Total Products: ${createdProducts.length}`);
    console.log(`  Total Orders: ${createdOrders.length}`);
    console.log('\nTest Credentials:');
    console.log('  Superadmin: superadmin@ecom.com / Super@123');
    console.log('  Admin 1: admin1@ecom.com / Admin@123');
    console.log('  Admin 2: admin2@ecom.com / Admin@123');
    console.log('  Regular User: rahul.sharma@mail.com / User@1234\n');

    await mongoose.connection.close();
    console.log('MongoDB connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run seed
seedDatabase();
