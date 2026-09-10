const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedDatabase() {
  const schedules = [
    { id: '7am-5pm', name: '7:00am - 5:00pm', overtime: 2, regularHours: 8 },
    { id: '10am-7pm', name: '10:00am - 7:00pm', overtime: 1, regularHours: 8 },
    { id: '12pm-9pm', name: '12:00pm to 9:00pm', overtime: 1, regularHours: 8 }
  ];

  const batch = db.batch();
  schedules.forEach(({ id, ...schedule }) => {
    batch.set(db.collection('noOfHours').doc(id), schedule, { merge: true });
  });

  await batch.commit();
  console.log(`Seeded ${schedules.length} work schedules in noOfHours`);
}

seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Could not seed work schedules:', error);
    process.exit(1);
  });
