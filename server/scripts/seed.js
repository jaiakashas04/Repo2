/**
 * Generates a JSON file of sample audit log records and, if MONGODB_URI is
 * set, inserts them directly into the database. Useful for testing the
 * bulk upload endpoint and populating the dashboard without manual data
 * entry.
 *
 * Usage:
 *   node scripts/seed.js            # writes sample-logs.json only
 *   node scripts/seed.js --insert   # also inserts directly into MongoDB
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ACTORS = [
  'priya.nair@company.com',
  'arjun.mehta@company.com',
  'lea.smith@company.com',
  'ravi.kumar@company.com',
  'system-bot@company.com',
  'zoe.chen@company.com',
];
const ROLES = ['admin', 'engineer', 'support', 'viewer', 'service-account'];
const ACTIONS = [
  'DELETE_USER',
  'CREATE_USER',
  'UPDATE_ROLE',
  'LOGIN_FAILED',
  'LOGIN_SUCCESS',
  'EXPORT_DATA',
  'DELETE_RESOURCE',
  'UPDATE_PERMISSIONS',
  'ACCESS_DENIED',
];
const RESOURCE_TYPES = ['USER', 'API_KEY', 'DATABASE', 'FILE', 'PERMISSION_SET'];
const REGIONS = ['ap-south-1', 'us-east-1', 'eu-west-1', 'ap-southeast-2'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['Unresolved', 'In Progress', 'Resolved'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIp() {
  return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function randomTimestamp() {
  const start = new Date('2025-01-01').getTime();
  const end = new Date('2025-12-31').getTime();
  return new Date(start + Math.random() * (end - start)).toISOString();
}

function generateRecords(count) {
  const records = [];
  for (let i = 0; i < count; i++) {
    const resourceType = pick(RESOURCE_TYPES);
    records.push({
      actor: pick(ACTORS),
      role: pick(ROLES),
      action: pick(ACTIONS),
      resource: `/api/${resourceType.toLowerCase()}s/${Math.floor(Math.random() * 1000)}`,
      resourceType,
      ipAddress: randomIp(),
      region: pick(REGIONS),
      severity: pick(SEVERITIES),
      status: pick(STATUSES),
      timestamp: randomTimestamp(),
    });
  }
  return records;
}

async function main() {
  const count = parseInt(process.argv[2], 10) || 10000;
  const records = generateRecords(count);
  const outPath = path.join(__dirname, 'sample-logs.json');
  fs.writeFileSync(outPath, JSON.stringify(records, null, 2));
  console.log(`Wrote ${count} sample records to ${outPath}`);

  if (process.argv.includes('--insert')) {
    const mongoose = require('mongoose');
    const Log = require('../models/Log');
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await Log.collection.insertMany(
      records.map((r) => ({ ...r, timestamp: new Date(r.timestamp) }))
    );
    console.log(`Inserted ${result.insertedCount} records into MongoDB.`);
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
