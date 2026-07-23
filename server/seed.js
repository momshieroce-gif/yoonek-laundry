const admin = require('firebase-admin');
const crypto = require('crypto');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// ⚠️ DEMO LOGIN PASSWORDS - move to environment variables in production
const SEED_PASSWORDS = {
  'admin@yooneklaundry.com': 'admin123',
  'staff@yooneklaundry.com': 'staff123'
};

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function resetCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const docs = await collectionRef.listDocuments();

  if (docs.length === 0) return;

  const batch = db.batch();
  docs.forEach((doc) => batch.delete(doc));
  await batch.commit();
  console.log(`Cleared ${docs.length} documents from ${collectionName}`);
}

async function resetAuthUsers() {
  try {
    const listUsersResult = await auth.listUsers(1000);
    if (listUsersResult.users.length === 0) return;

    const deletePromises = listUsersResult.users.map((user) => auth.deleteUser(user.uid));
    await Promise.all(deletePromises);
    console.log(`Cleared ${listUsersResult.users.length} Firebase Auth users`);
  } catch (error) {
    console.warn('Warning: could not clear auth users:', error.message);
  }
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Reset existing data
    console.log('Resetting existing data...');
    await resetAuthUsers();
    await resetCollection('users');
    await resetCollection('roles');
    await resetCollection('branches');
    await resetCollection('service_types');
    await resetCollection('sales');
    await resetCollection('inventory');
    await resetCollection('attendance');

    // Seed Users
    console.log('Seeding users...');
    const users = [
      {
        uid: 'admin-user-1',
        email: 'admin@yooneklaundry.com',
        displayName: 'Admin User',
        roleId: 'admin',
        phone: '+1234567890',
        branchId: null,
        passwordHash: hashPassword(SEED_PASSWORDS['admin@yooneklaundry.com']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        uid: 'staff-user-1',
        email: 'staff@yooneklaundry.com',
        displayName: 'Staff User',
        roleId: 'staff',
        phone: '+1234567891',
        branchId: null,
        passwordHash: hashPassword(SEED_PASSWORDS['staff@yooneklaundry.com']),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const user of users) {
      const plainPassword = SEED_PASSWORDS[user.email];

      // Create Firebase Auth user (securely handled by Firebase)
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: plainPassword,
        displayName: user.displayName
      });

      // Store user document exactly as defined in the users array
      await db.collection('users').doc(user.uid).set(user);
      console.log(`Created user: ${user.email} (password: ${plainPassword})`);
    }

    // Seed Roles (stored as a reference in users, but we can create a roles collection)
    console.log('Seeding roles...');
    const roles = [
      {
        name: 'admin',
        description: 'Full system access',
        permissions: ['all'],
        createdAt: new Date()
      },
      {
        name: 'staff',
        description: 'Limited access - monthly sales only',
        permissions: ['read', 'create', 'update'],
        createdAt: new Date()
      }
    ];

    for (const role of roles) {
      await db.collection('roles').doc(role.name).set(role);
      console.log(`Created role: ${role.name}`);
    }

    // Seed Branches
    console.log('Seeding branches...');
    const branches = [
      {
        name: 'YOONEK LAUNDRY HUB-PAJAC',
        address: '123 Main Street, City Center',
        phone: '+1234567890',
        manager: 'Admin User',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'YOONEK LAUNDRY HUB-ABUNO',
        address: '456 Downtown Ave, Business District',
        phone: '+1234567891',
        manager: 'Staff User',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'YOONEK LAUNDRY HUB-AGUS',
        address: '456 Downtown Ave, Business District',
        phone: '+1234567891',
        manager: 'Staff User',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'YOONEK LAUNDRY HUB-PAKPAKAN',
        address: '456 Downtown Ave, Business District',
        phone: '+1234567891',
        manager: 'Staff User',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const branchIds = [];
    for (const branch of branches) {
      const docRef = await db.collection('branches').add(branch);
      branchIds.push(docRef.id);
      console.log(`Created branch: ${branch.name}`);
    }

    // Update users with branch assignments
    await db.collection('users').doc('staff-user-1').update({
      branchId: branchIds[1]
    });

    // Seed Service Types
    console.log('Seeding service types...');
    const serviceTypes = [
      //YOONEK LAUNDRY HUB-PAJAC  
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'FULL SERVICE (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 135,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'BEDDINGS/TOWELS/BLANKETS (6KG) ',
        unit: 'kg',
        minimumPerUnit: 6,
        price: 135,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'COMFORTER (PER PC)',
        unit: 'pc',
        minimumPerUnit: 1,
        price: 135,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'WASH ONLY (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 65,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'DRY ONLY (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 70,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'STAIN REMOVAL (MIN 3KG)',
        unit: 'kg',
        minimumPerUnit: 3,
        price: 90,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'SPIN (PUGA) (11 minutes)',
        unit: 'minutes',
        minimumPerUnit: 11,
        price: 20,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'ADD DRY - (10MINUTES)',
        unit: 'minutes',
        minimumPerUnit: 10,
        price: 20,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'STEAM IRON - 50 PER PC',
        unit: 'pc',
        minimumPerUnit: 50,
        price: 20,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[0],
        branchName: branches[0].name,
        name: 'VIP RUSH (2HRS) ',
        unit: 'hours',
        minimumPerUnit: 2,
        price: 70,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      //YOONEK LAUNDRY HUB-ABUNO
      {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'FULL SERVICE (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 135,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'BEDDINGS/TOWELS/BLANKETS (6KG) ',
        unit: 'kg',
        minimumPerUnit: 6,
        price: 145,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'COMFORTER (PER PC)',
        unit: 'pc',
        minimumPerUnit: 1,
        price: 70,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
       {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'WASH ONLY (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 65,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'DRY ONLY (8KG)',
        unit: 'kg',
        minimumPerUnit: 1,
        price: 70,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'STAIN REMOVAL (MIN 3KG)',
        unit: 'kg',
        minimumPerUnit: 3,
        price: 90,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'SPIN (PUGA) (11 minutes)',
        unit: 'minutes',
        minimumPerUnit: 11,
        price: 20,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'ADD DRY - (10MINUTES)',
        unit: 'minutes',
        minimumPerUnit: 10,
        price: 20,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'STEAM IRON - 50 PER PC',
        unit: 'pc',
        minimumPerUnit: 50,
        price: 50,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[1],
        branchName: branches[1].name,
        name: 'VIP RUSH (2HRS) ',
        unit: 'hours',
        minimumPerUnit: 2,
        price: 70,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      //YOONEK LAUNDRY HUB-AGUS
      {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'FULL SERVICE (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 145,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'BEDDINGS/TOWELS/BLANKETS (6KG) ',
        unit: 'kg',
        minimumPerUnit: 6,
        price: 145,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'COMFORTER (PER PC)',
        unit: 'pc',
        minimumPerUnit: 1,
        price: 145,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
       {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'WASH ONLY (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 65,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'DRY ONLY (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 70,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'STAIN REMOVAL (MIN 3KG)',
        unit: 'kg',
        minimumPerUnit: 3,
        price: 90,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'SPIN (PUGA) (11 minutes)',
        unit: 'minutes',
        minimumPerUnit: 11,
        price: 20,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'ADD DRY - (10MINUTES)',
        unit: 'minutes',
        minimumPerUnit: 10,
        price: 20,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'STEAM IRON - 50 PER PC',
        unit: 'pc',
        minimumPerUnit: 50,
        price: 50,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[2],
        branchName: branches[2].name,
        name: 'VIP RUSH (2HRS) ',
        unit: 'hours',
        minimumPerUnit: 2,
        price: 70,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      //YOONEK LAUNDRY HUB-PAKPAKAN
      {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'FULL SERVICE (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 155,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'BEDDINGS/TOWELS/BLANKETS (6KG) ',
        unit: 'kg',
        minimumPerUnit: 6,
        price: 155,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'COMFORTER (PER PC)',
        unit: 'pc',
        minimumPerUnit: 1,
        price: 155,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
       {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'WASH ONLY (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 65,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'DRY ONLY (8KG)',
        unit: 'kg',
        minimumPerUnit: 8,
        price: 70,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'STAIN REMOVAL (MIN 3KG)',
        unit: 'kg',
        minimumPerUnit: 3,
        price: 90,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'SPIN (PUGA) (11 minutes)',
        unit: 'minutes',
        minimumPerUnit: 11,
        price: 20,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'ADD DRY - (10MINUTES)',
        unit: 'minutes',
        minimumPerUnit: 10,
        price: 20,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'STEAM IRON - 50 PER PC',
        unit: 'pc',
        minimumPerUnit: 50,
        price: 50,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        branchId: branchIds[3],
        branchName: branches[3].name,
        name: 'VIP RUSH (2HRS) ',
        unit: 'hours',
        minimumPerUnit: 2,
        price: 70,
        createdBy: 'admin-user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const seededServiceTypes = [];
    for (const serviceType of serviceTypes) {
      const docRef = await db.collection('service_types').add(serviceType);
      seededServiceTypes.push({ id: docRef.id, ...serviceType });
      console.log(`Created service type: ${serviceType.name}`);
    }

    // Seed Sales
    console.log('Seeding sales...');
    const statuses = ['Pending', 'In Progress', 'Ready', 'Completed'];
    const paymentStatuses = ['Paid', 'Unpaid'];
    const paymentTypes = ['Cash', 'Gcash', 'Bank Transfer'];
    const sales = [];
    const now = new Date();
    
    for (let i = 0; i < 20; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor(Math.random() * 60)); // Last 60 days
      
      const serviceType = seededServiceTypes[i % seededServiceTypes.length];
      const sale = {
        branchId: branchIds[Math.floor(Math.random() * branchIds.length)],
        customerName: `Customer ${i + 1}`,
        customerPhone: `+1234567${String(i).padStart(4, '0')}`,
        service: serviceType.name,
        amount: serviceType.price,
        weight: parseFloat((Math.random() * 10 + 1).toFixed(2)),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
        paymentType: paymentTypes[Math.floor(Math.random() * paymentTypes.length)],
        notes: `Special instructions for order #${i + 1}`,
        createdBy: Math.random() > 0.5 ? 'admin-user-1' : 'staff-user-1',
        createdAt: date,
        updatedAt: date
      };
      sales.push(sale);
    }

    for (const sale of sales) {
      await db.collection('sales').add(sale);
    }
    console.log(`Created ${sales.length} sales records`);

    // Seed Inventory
    console.log('Seeding inventory...');
  
    const items = [
      { name: 'DETERGENT', quantity: 30, minStock: 10, unitPrice: 16 },
      { name: 'DOWNY', quantity: 30, minStock: 8, unitPrice: 8 },
      { name: 'ZONROX', quantity: 30, minStock: 8, unitPrice: 8 },
      { name: 'PLASTIC', quantity: 30, minStock: 8, unitPrice: 2 }
    ];

    for (const item of items) {
      for (const branchId of branchIds) {
        await db.collection('inventory').add({
          ...item,
          branchId: branchId,
          notes: 'Regular stock item',
          createdBy: 'admin-user-1',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    console.log(`Created inventory items for ${branchIds.length} branches`);

    // Seed Attendance (standard fields + biometric integration fields)
    console.log('Seeding attendance...');
    const attendanceStatuses = ['Present', 'Late', 'Absent', 'On Leave'];
    const verifyMethods = ['fingerprint', 'face', 'card', 'pin'];
    const attendanceUsers = [
      { uid: 'admin-user-1', name: 'Admin User', branchId: branchIds[0], branchName: branches[0].name, biometricUserId: 'BIO-0001' },
      { uid: 'staff-user-1', name: 'Staff User', branchId: branchIds[1], branchName: branches[1].name, biometricUserId: 'BIO-0002' }
    ];

    let attendanceCount = 0;
    for (const attUser of attendanceUsers) {
      for (let d = 0; d < 15; d++) {
        const day = new Date(now);
        day.setDate(day.getDate() - d);
        if (day.getDay() === 0) continue; // skip Sundays

        const status = d === 3 && attUser.uid === 'staff-user-1'
          ? 'On Leave'
          : attendanceStatuses[Math.floor(Math.random() * 2)]; // mostly Present/Late

        const isAbsent = status === 'Absent' || status === 'On Leave';

        const timeIn = new Date(day);
        timeIn.setHours(8, status === 'Late' ? 15 + Math.floor(Math.random() * 45) : Math.floor(Math.random() * 10), 0, 0);
        const timeOut = new Date(day);
        timeOut.setHours(17, Math.floor(Math.random() * 30), 0, 0);

        const workHours = isAbsent ? 0 : parseFloat(((timeOut - timeIn) / 3600000).toFixed(2));

        await db.collection('attendance').add({
          // Standard attendance fields
          userId: attUser.uid,
          userName: attUser.name,
          branchId: attUser.branchId,
          branchName: attUser.branchName,
          date: day.toISOString().split('T')[0],
          timeIn: isAbsent ? null : timeIn,
          timeOut: isAbsent ? null : timeOut,
          workHours,
          status,
          notes: '',
          // Biometric integration fields
          biometricUserId: attUser.biometricUserId,
          deviceId: `ZK-${attUser.branchName === branches[0].name ? '01' : '02'}`,
          deviceLocation: attUser.branchName,
          verifyMethod: isAbsent ? null : verifyMethods[Math.floor(Math.random() * verifyMethods.length)],
          verifyScore: isAbsent ? null : parseFloat((0.85 + Math.random() * 0.15).toFixed(2)),
          punchTypeIn: isAbsent ? null : 'check-in',
          punchTypeOut: isAbsent ? null : 'check-out',
          syncedFromDevice: !isAbsent,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        attendanceCount++;
      }
    }
    console.log(`Created ${attendanceCount} attendance records`);

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
