const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const CASH_ACCOUNT_ID = '1000';
const RECEIVABLE_ACCOUNT_ID = '1200';
const REVENUE_ACCOUNT_ID = '4000';
const SALES_PER_BATCH = 250;

async function ensureAccounts() {
  const cashRef = db.collection('accounts').doc(CASH_ACCOUNT_ID);
  const receivableRef = db.collection('accounts').doc(RECEIVABLE_ACCOUNT_ID);
  const revenueRef = db.collection('accounts').doc(REVENUE_ACCOUNT_ID);
  const [cashAccount, receivableAccount, revenueAccount] = await db.getAll(
    cashRef,
    receivableRef,
    revenueRef
  );

  if (!cashAccount.exists || cashAccount.data().type !== 'asset') {
    throw new Error('Cash account 1000 is missing or is not an asset account.');
  }
  if (!revenueAccount.exists || revenueAccount.data().type !== 'revenue') {
    throw new Error('Sales Revenue account 4000 is missing or is not a revenue account.');
  }

  if (!receivableAccount.exists) {
    const now = Timestamp.now();
    await receivableRef.set({
      code: RECEIVABLE_ACCOUNT_ID,
      name: 'Accounts Receivable',
      type: 'asset',
      normalBalance: 'debit',
      isActive: true,
      createdAt: now,
      updatedAt: now
    });
    console.log('Created account 1200 - Accounts Receivable.');
  } else if (receivableAccount.data().type !== 'asset') {
    throw new Error('Accounts Receivable account 1200 is not an asset account.');
  }
}

function getSaleAmount(sale) {
  const amount = Number(sale.total ?? sale.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function getJournalStatus(sale) {
  return String(sale.status || '').toLowerCase() === 'completed' ? 'posted' : 'draft';
}

function getDebitAccountId(sale) {
  return String(sale.paymentStatus || '').toLowerCase() === 'paid'
    ? CASH_ACCOUNT_ID
    : RECEIVABLE_ACCOUNT_ID;
}

async function syncSales() {
  console.log('Starting sales accounting synchronization...');
  await ensureAccounts();

  const salesSnapshot = await db.collection('sales').get();
  const sales = salesSnapshot.docs;
  let syncedCount = 0;
  let cancelledCount = 0;
  let skippedCount = 0;

  for (let offset = 0; offset < sales.length; offset += SALES_PER_BATCH) {
    const batch = db.batch();
    const salesChunk = sales.slice(offset, offset + SALES_PER_BATCH);

    salesChunk.forEach((saleDocument) => {
      const sale = saleDocument.data();
      const journalEntryId = `sale-${saleDocument.id}`;
      const journalEntryRef = db.collection('journalEntries').doc(journalEntryId);
      const isCancelled = String(sale.status || '').toLowerCase() === 'cancelled';

      if (isCancelled) {
        batch.delete(journalEntryRef);
        batch.set(saleDocument.ref, {
          journalEntryId: FieldValue.delete(),
          debitAccountId: FieldValue.delete(),
          revenueAccountId: FieldValue.delete(),
          accountingStatus: 'cancelled',
          accountingSyncedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        cancelledCount += 1;
        return;
      }

      const amount = getSaleAmount(sale);
      if (amount <= 0) {
        skippedCount += 1;
        return;
      }

      const debitAccountId = getDebitAccountId(sale);
      const journalStatus = getJournalStatus(sale);
      const transactionDate = sale.createdAt || sale.updatedAt || Timestamp.now();
      const createdBy = sale.createdBy || sale.userId || 'sales-sync';
      const invoiceReference = sale.invoiceNo ? ` ${sale.invoiceNo}` : '';

      batch.set(journalEntryRef, {
        transactionDate,
        description: `Sale${invoiceReference}`,
        referenceType: 'sale',
        referenceId: saleDocument.id,
        totalDebit: amount,
        totalCredit: amount,
        status: journalStatus,
        createdAt: transactionDate,
        createdBy,
        branchId: sale.branchId || '',
        updatedAt: FieldValue.serverTimestamp(),
        lines: [
          { accountId: debitAccountId, debit: amount, credit: 0 },
          { accountId: REVENUE_ACCOUNT_ID, debit: 0, credit: amount }
        ]
      }, { merge: true });

      batch.set(saleDocument.ref, {
        journalEntryId,
        debitAccountId,
        revenueAccountId: REVENUE_ACCOUNT_ID,
        accountingStatus: journalStatus,
        accountingSyncedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      syncedCount += 1;
    });

    await batch.commit();
    console.log(`Processed ${Math.min(offset + salesChunk.length, sales.length)} of ${sales.length} sales.`);
  }

  console.log('Sales accounting synchronization completed.');
  console.log(`Synced: ${syncedCount}, cancelled: ${cancelledCount}, skipped: ${skippedCount}.`);
}

syncSales()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Sales accounting synchronization failed:', error);
    process.exit(1);
  });