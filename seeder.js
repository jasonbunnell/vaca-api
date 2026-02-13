const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, 'config', '.env') });
require('dotenv').config();

const connectDB = require('./config/db');
const User = require('./models/User');
const Property = require('./models/Property');

const importData = async () => {
  try {
    await connectDB();

    const usersPath = path.join(__dirname, '_data', 'newUsers.json');
    const propertiesPath = path.join(__dirname, '_data', 'newProperty.json');

    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const propertiesData = JSON.parse(fs.readFileSync(propertiesPath, 'utf-8'));

    await User.deleteMany();
    await Property.deleteMany();

    const users = await User.create(usersData);

    const userByEmail = users.reduce((acc, u) => {
      acc[u.email.toLowerCase()] = u._id;
      return acc;
    }, {});

    const propertiesWithOwner = propertiesData.map((p) => {
      const { ownerEmail, ...rest } = p;
      const ownerId = userByEmail[ownerEmail?.toLowerCase()];
      if (!ownerId) throw new Error(`No user found for ownerEmail: ${ownerEmail}`);
      return { ...rest, owner: ownerId };
    });

    await Property.create(propertiesWithOwner);

    console.log('Data imported: %d users, %d properties', users.length, propertiesWithOwner.length);
    process.exit(0);
  } catch (err) {
    console.error('Import error:', err);
    process.exit(1);
  }
};

const deleteData = async () => {
  try {
    await connectDB();

    await Property.deleteMany();
    await User.deleteMany();

    console.log('Data deleted: users and properties collections cleared.');
    process.exit(0);
  } catch (err) {
    console.error('Delete error:', err);
    process.exit(1);
  }
};

const flag = process.argv[2];
if (flag === '-i') {
  importData();
} else if (flag === '-d') {
  deleteData();
} else {
  console.log('Usage: node seeder.js -i | -d');
  console.log('  -i  Import data from _data/newUsers.json and _data/newProperty.json');
  console.log('  -d  Delete all users and properties');
  process.exit(1);
}
