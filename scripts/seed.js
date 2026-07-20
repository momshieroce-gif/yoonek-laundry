/* eslint-env node */
/**
 * Firestore Seed Script (Firebase Admin SDK)
 * Seeds: roles, users, inventory, sales, sale_items, inventory_transactions
 *
 * Uses the service account key at server/firebase-service-account.json
 * (already gitignored). The Admin SDK bypasses Firestore security rules.
 *
 * Run with: node scripts/seed.js
 */

const path = require('path')
const admin = require('firebase-admin')

const serviceAccountPath = path.join(__dirname, '..', 'server', 'firebase-service-account.json')

let serviceAccount
try {
  serviceAccount = require(serviceAccountPath)
} catch (err) {
  console.error('ERROR: service account key not found at server/firebase-service-account.json')
  console.error('Download it from Firebase Console > Project Settings > Service Accounts > Generate new private key')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

const now = admin.firestore.Timestamp.now()

// ---------------------------------------------------------------------------
// 1. roles
// ---------------------------------------------------------------------------
const roles = {
  admin: {
    name: 'Admin',
    code: 'ADMIN',
    description: 'Full system access',
    status: 'active',
    createdAt: now,
    updatedAt: now
  },
  cashier: {
    name: 'Cashier',
    code: 'CASHIER',
    description: 'Can process sales',
    status: 'active',
    createdAt: now,
    updatedAt: now
  },
  staff: {
    name: 'Staff',
    code: 'STAFF',
    description: 'General laundry staff',
    status: 'active',
    createdAt: now,
    updatedAt: now
  }
}

// ---------------------------------------------------------------------------
// 2. users
// ---------------------------------------------------------------------------
const ADMIN_ID = 'user-admin-001'
const CASHIER_ID = 'user-cashier-001'
const STAFF_ID = 'user-staff-001'

const users = {
  [ADMIN_ID]: {
    firstName: 'Bobby',
    lastName: 'Gerez',
    email: 'bobby@email.com',
    mobileNumber: '09171234567',
    roleId: 'admin',
    status: 'active',
    avatarUrl: '',
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: ADMIN_ID,
    updatedBy: ADMIN_ID
  },
  [CASHIER_ID]: {
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@email.com',
    mobileNumber: '09181234567',
    roleId: 'cashier',
    status: 'active',
    avatarUrl: '',
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: ADMIN_ID,
    updatedBy: ADMIN_ID
  },
  [STAFF_ID]: {
    firstName: 'Juan',
    lastName: 'Reyes',
    email: 'juan.reyes@email.com',
    mobileNumber: '09191234567',
    roleId: 'staff',
    status: 'active',
    avatarUrl: '',
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: ADMIN_ID,
    updatedBy: ADMIN_ID
  }
}

// ---------------------------------------------------------------------------
// 3. inventory
// ---------------------------------------------------------------------------
const inventory = {
  'inv-detergent-001': {
    name: 'Detergent',
    sku: 'DET-001',
    category: 'Cleaning Supplies',
    unit: 'bottle',
    currentStock: 50,
    minimumStock: 10,
    costPrice: 80,
    sellingPrice: 100,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: ADMIN_ID,
    updatedBy: ADMIN_ID
  },
  'inv-fabcon-001': {
    name: 'Fabric Conditioner',
    sku: 'FAB-001',
    category: 'Cleaning Supplies',
    unit: 'bottle',
    currentStock: 40,
    minimumStock: 10,
    costPrice: 60,
    sellingPrice: 85,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: ADMIN_ID,
    updatedBy: ADMIN_ID
  },
  'inv-bleach-001': {
    name: 'Bleach',
    sku: 'BLE-001',
    category: 'Cleaning Supplies',
    unit: 'bottle',
    currentStock: 30,
    minimumStock: 5,
    costPrice: 45,
    sellingPrice: 65,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: ADMIN_ID,
    updatedBy: ADMIN_ID
  },
  'inv-laundrybag-001': {
    name: 'Laundry Bag',
    sku: 'BAG-001',
    category: 'Packaging',
    unit: 'piece',
    currentStock: 100,
    minimumStock: 20,
    costPrice: 5,
    sellingPrice: 10,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: ADMIN_ID,
    updatedBy: ADMIN_ID
  }
}

// ---------------------------------------------------------------------------
// 4. sales
// ---------------------------------------------------------------------------
const SALE_1_ID = 'sale-000001'
const SALE_2_ID = 'sale-000002'

const sales = {
  [SALE_1_ID]: {
    saleNumber: 'SALE-000001',
    saleDate: now,
    customerName: 'Juan Dela Cruz',
    customerMobileNumber: '09171234567',
    subtotal: 500,
    discount: 0,
    tax: 0,
    totalAmount: 500,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
    cashierId: CASHIER_ID,
    createdAt: now,
    updatedAt: now
  },
  [SALE_2_ID]: {
    saleNumber: 'SALE-000002',
    saleDate: now,
    customerName: 'Ana Lopez',
    customerMobileNumber: '09201234567',
    subtotal: 300,
    discount: 20,
    tax: 0,
    totalAmount: 280,
    paymentMethod: 'gcash',
    paymentStatus: 'paid',
    status: 'completed',
    cashierId: CASHIER_ID,
    createdAt: now,
    updatedAt: now
  }
}

// ---------------------------------------------------------------------------
// 5. sale_items
// ---------------------------------------------------------------------------
const saleItems = {
  'sale-item-000001': {
    saleId: SALE_1_ID,
    productId: 'wash-fold',
    productName: 'Wash & Fold',
    quantity: 2,
    unitPrice: 150,
    discount: 0,
    totalAmount: 300,
    createdAt: now
  },
  'sale-item-000002': {
    saleId: SALE_1_ID,
    productId: 'dry-cleaning',
    productName: 'Dry Cleaning',
    quantity: 1,
    unitPrice: 200,
    discount: 0,
    totalAmount: 200,
    createdAt: now
  },
  'sale-item-000003': {
    saleId: SALE_2_ID,
    productId: 'ironing',
    productName: 'Ironing',
    quantity: 2,
    unitPrice: 150,
    discount: 20,
    totalAmount: 280,
    createdAt: now
  }
}

// ---------------------------------------------------------------------------
// 6. inventory_transactions
// ---------------------------------------------------------------------------
const inventoryTransactions = {
  'invtx-000001': {
    inventoryId: 'inv-detergent-001',
    type: 'purchase',
    quantity: 50,
    previousStock: 0,
    newStock: 50,
    referenceType: 'purchase',
    referenceId: 'po-000001',
    remarks: 'Initial stock purchase',
    createdBy: ADMIN_ID,
    createdAt: now
  },
  'invtx-000002': {
    inventoryId: 'inv-detergent-001',
    type: 'sale',
    quantity: -2,
    previousStock: 52,
    newStock: 50,
    referenceType: 'sale',
    referenceId: SALE_1_ID,
    remarks: 'Sold to customer',
    createdBy: CASHIER_ID,
    createdAt: now
  },
  'invtx-000003': {
    inventoryId: 'inv-fabcon-001',
    type: 'adjustment',
    quantity: -1,
    previousStock: 41,
    newStock: 40,
    referenceType: 'adjustment',
    referenceId: 'adj-000001',
    remarks: 'Damaged bottle written off',
    createdBy: ADMIN_ID,
    createdAt: now
  }
}

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------
async function seedCollection(collectionName, docs) {
  const entries = Object.entries(docs)
  const batch = db.batch()
  for (const [id, data] of entries) {
    batch.set(db.collection(collectionName).doc(id), data)
  }
  await batch.commit()
  entries.forEach(([id]) => console.log(`  ✓ ${collectionName}/${id}`))
  console.log(`Seeded ${entries.length} doc(s) into "${collectionName}"\n`)
}

async function main() {
  console.log('Seeding Firestore...\n')

  await seedCollection('roles', roles)
  await seedCollection('users', users)
  await seedCollection('inventory', inventory)
  await seedCollection('sales', sales)
  await seedCollection('sale_items', saleItems)
  await seedCollection('inventory_transactions', inventoryTransactions)

  console.log('Done! All collections seeded successfully.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seeding failed:', err.message)
  process.exit(1)
})
