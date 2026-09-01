const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const TARGET_REFERENCE_TYPES = new Set(['sale', 'employeeSalary', 'cashAdvance', 'branchOpeningCapital', 'expense']);
const WRITES_PER_BATCH = 400;

async function resetSampleJournalsToDraft() {
  const snapshot = await db.collection('journalEntries')
    .where('status', '==', 'posted')
    .get();
  const journals = snapshot.docs.filter((journal) => (
    TARGET_REFERENCE_TYPES.has(journal.data().referenceType)
  ));

  const counts = journals.reduce((result, journal) => {
    const referenceType = journal.data().referenceType;
    result[referenceType] = (result[referenceType] || 0) + 1;
    return result;
  }, {});

  console.log(`Found ${journals.length} posted sample journal(s).`);
  console.log(`Sales: ${counts.sale || 0}, employee salaries: ${counts.employeeSalary || 0}, cash advances: ${counts.cashAdvance || 0}, branch openings: ${counts.branchOpeningCapital || 0}, expenses: ${counts.expense || 0}.`);

  for (let offset = 0; offset < journals.length; offset += WRITES_PER_BATCH) {
    const batch = db.batch();
    const chunk = journals.slice(offset, offset + WRITES_PER_BATCH);

    chunk.forEach((journal) => {
      const data = journal.data();
      batch.update(journal.ref, {
        status: 'draft',
        postedAt: FieldValue.delete(),
        postedBy: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      });

      if (data.referenceType === 'sale' && data.referenceId) {
        batch.set(db.collection('sales').doc(data.referenceId), {
          accountingStatus: 'draft',
          accountingSyncedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
    });

    await batch.commit();
    console.log(`Reset ${Math.min(offset + chunk.length, journals.length)} of ${journals.length} journal(s).`);
  }

  console.log('Sample journals are now drafts. No source documents or journal amounts were deleted.');
}

resetSampleJournalsToDraft()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Could not reset sample journals:', error);
    process.exit(1);
  });