const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const accounts = [
  { code: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit' },
  { code: '1100', name: 'Inventory', type: 'asset', normalBalance: 'debit' },
  { code: '2000', name: 'Accounts Payable', type: 'liability', normalBalance: 'credit' },
  { code: '2100', name: 'Loan Payable', type: 'liability', normalBalance: 'credit' },
  { code: '3000', name: "Owner's Equity", type: 'equity', normalBalance: 'credit' },
  { code: '4000', name: 'Sales Revenue', type: 'revenue', normalBalance: 'credit' },
  { code: '5000', name: 'Rent Expense', type: 'expense', normalBalance: 'debit' },
  { code: '5100', name: 'Supplies Expense', type: 'expense', normalBalance: 'debit' },
  { code: '5200', name: 'Salaries and Wages Expense', type: 'expense', normalBalance: 'debit' }
];

async function seedAccounts() {
  const accountCollection = db.collection('accounts');
  const accountRefs = accounts.map((account) => accountCollection.doc(account.code));
  const existingAccounts = await db.getAll(...accountRefs);
  const batch = db.batch();
  const now = admin.firestore.Timestamp.now();

  accounts.forEach((account, index) => {
    const existingData = existingAccounts[index].data();
    batch.set(accountRefs[index], {
      ...account,
      isActive: true,
      createdAt: existingData?.createdAt || now,
      updatedAt: now
    }, { merge: true });
  });

  await batch.commit();
  console.log(`Seeded ${accounts.length} accounts.`);
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    await seedAccounts();
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
