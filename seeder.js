const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, 'config', '.env') });
require('dotenv').config({ override: true });

const connectDB = require('./config/db');
const User = require('./models/User');
const Property = require('./models/Property');

const usersPath = path.join(__dirname, '_data', 'newUsers.json');
const propertiesPath = path.join(__dirname, '_data', 'newProperty.json');

// PRD: password = first 3 letters of first name + first 3 of last (cap first) + '22'. e.g. Jason Bunnell -> JasBun22
function seedPassword(firstName, lastName) {
  const f = (firstName || '').trim().slice(0, 3).toLowerCase();
  const l = (lastName || '').trim();
  const l3 = (l.charAt(0).toUpperCase() + l.slice(1, 3).toLowerCase()).slice(0, 3);
  return `${f}${l3}22`;
}

async function importUsers() {
  const usersRaw = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  const usersData = usersRaw.map((u) => ({
    firstName: u.firstName,
    lastName: u.lastName,
    name: `${(u.firstName || '').trim()} ${(u.lastName || '').trim()}`.trim(),
    email: u.email,
    phone: u.phone || '',
    role: u.role || 'user',
    password: seedPassword(u.firstName, u.lastName),
  }));
  const users = await User.create(usersData);
  return users;
}

async function importProperties() {
  const propertiesData = JSON.parse(fs.readFileSync(propertiesPath, 'utf-8'));
  const users = await User.find();
  const userByEmail = users.reduce((acc, u) => {
    acc[u.email.toLowerCase()] = u._id;
    return acc;
  }, {});
  const propertiesWithHost = propertiesData.map((p) => {
    const { ownerEmail, hostEmail, host, ...rest } = p;
    const email = (hostEmail || ownerEmail)?.toLowerCase();
    const firstHostId = email ? userByEmail[email] : null;
    if (!firstHostId) throw new Error(`No user found for host/owner email: ${email || hostEmail || ownerEmail}`);
    const hostIds = Array.isArray(host) && host.length
      ? host.map((id) => (typeof id === 'string' ? id : id?.toString?.())).filter(Boolean)
      : [firstHostId];
    return { ...rest, host: hostIds };
  });
  const created = await Property.create(propertiesWithHost);
  return created;
}

// --- Import only users
const importUsersOnly = async () => {
  try {
    await connectDB();
    await User.deleteMany();
    const users = await importUsers();
    console.log('Users imported: %d', users.length);
    process.exit(0);
  } catch (err) {
    console.error('Import users error:', err);
    process.exit(1);
  }
};

// --- Import only properties (existing users must exist; properties are replaced)
const importPropertiesOnly = async () => {
  try {
    await connectDB();
    await Property.deleteMany();
    const properties = await importProperties();
    console.log('Properties imported: %d', properties.length);
    process.exit(0);
  } catch (err) {
    console.error('Import properties error:', err);
    process.exit(1);
  }
};

// --- Import both (full seed: replace users and properties)
const importAll = async () => {
  try {
    await connectDB();
    await User.deleteMany();
    await Property.deleteMany();
    const users = await importUsers();
    const properties = await importProperties();
    console.log('Data imported: %d users, %d properties', users.length, properties.length);
    process.exit(0);
  } catch (err) {
    console.error('Import error:', err);
    process.exit(1);
  }
};

// --- Delete only users
const deleteUsersOnly = async () => {
  try {
    await connectDB();
    const result = await User.deleteMany();
    console.log('Users deleted: %d', result.deletedCount);
    process.exit(0);
  } catch (err) {
    console.error('Delete users error:', err);
    process.exit(1);
  }
};

// --- Delete only properties
const deletePropertiesOnly = async () => {
  try {
    await connectDB();
    const result = await Property.deleteMany();
    console.log('Properties deleted: %d', result.deletedCount);
    process.exit(0);
  } catch (err) {
    console.error('Delete properties error:', err);
    process.exit(1);
  }
};

// --- Delete both
const deleteAll = async () => {
  try {
    await connectDB();
    await Property.deleteMany();
    const userResult = await User.deleteMany();
    console.log('Data deleted: users and properties cleared (users: %d)', userResult.deletedCount);
    process.exit(0);
  } catch (err) {
    console.error('Delete error:', err);
    process.exit(1);
  }
};

// --- CLI
const flag = process.argv[2];
switch (flag) {
  case '-i':
  case '--import-all':
    importAll();
    break;
  case '-iu':
  case '--import-users':
    importUsersOnly();
    break;
  case '-ip':
  case '--import-properties':
    importPropertiesOnly();
    break;
  case '-d':
  case '--delete-all':
    deleteAll();
    break;
  case '-du':
  case '--delete-users':
    deleteUsersOnly();
    break;
  case '-dp':
  case '--delete-properties':
    deletePropertiesOnly();
    break;
  default:
    console.log('Usage: node seeder.js <flag>');
    console.log('');
    console.log('Import:');
    console.log('  -i,  --import-all        Delete all, then import users + properties from _data/');
    console.log('  -iu, --import-users      Delete all users, then import users from _data/newUsers.json');
    console.log('  -ip, --import-properties Delete all properties, then import from _data/newProperty.json');
    console.log('');
    console.log('Delete:');
    console.log('  -d,  --delete-all        Delete all users and properties');
    console.log('  -du, --delete-users      Delete all users only');
    console.log('  -dp, --delete-properties  Delete all properties only');
    console.log('');
    console.log('Example (refresh properties without touching users):  node seeder.js -dp && node seeder.js -ip');
    process.exit(1);
}
