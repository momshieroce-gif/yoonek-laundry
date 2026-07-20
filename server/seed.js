const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Seed Users
    console.log('Seeding users...');
    const users = [
      {
        uid: 'admin-user-1',
        email: 'admin@yooneklaundry.com',
        displayName: 'Admin User',
        role: 'admin',
        phone: '+1234567890',
        branchId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        uid: 'staff-user-1',
        email: 'staff@yooneklaundry.com',
        displayName: 'Staff User',
        role: 'staff',
        phone: '+1234567891',
        branchId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const user of users) {
      await db.collection('users').doc(user.uid).set(user);
      console.log(`Created user: ${user.email}`);
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
        name: 'Main Branch',
        address: '123 Main Street, City Center',
        phone: '+1234567890',
        manager: 'Admin User',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Downtown Branch',
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

    // Seed Sales
    console.log('Seeding sales...');
    const services = ['Wash & Fold', 'Dry Cleaning', 'Ironing', 'Premium Service'];
    const statuses = ['Pending', 'In Progress', 'Ready', 'Completed'];
    
    const sales = [];
    const now = new Date();
    
    for (let i = 0; i < 20; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor(Math.random() * 60)); // Last 60 days
      
      const sale = {
        branchId: branchIds[Math.floor(Math.random() * branchIds.length)],
        customerName: `Customer ${i + 1}`,
        customerPhone: `+1234567${String(i).padStart(4, '0')}`,
        service: services[Math.floor(Math.random() * services.length)],
        amount: parseFloat((Math.random() * 100 + 20).toFixed(2)),
        weight: parseFloat((Math.random() * 10 + 1).toFixed(2)),
        status: statuses[Math.floor(Math.random() * statuses.length)],
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
    const categories = ['Detergent', 'Fabric Softener', 'Bleach', 'Hangers', 'Packaging', 'Equipment', 'Other'];
    const items = [
      { name: 'Premium Detergent', category: 'Detergent', quantity: 50, minStock: 10, unitPrice: 15.99, supplier: 'CleanCo Supplies' },
      { name: 'Fabric Softener', category: 'Fabric Softener', quantity: 30, minStock: 8, unitPrice: 12.50, supplier: 'CleanCo Supplies' },
      { name: 'Color-Safe Bleach', category: 'Bleach', quantity: 20, minStock: 5, unitPrice: 8.99, supplier: 'ChemCorp' },
      { name: 'Plastic Hangers', category: 'Hangers', quantity: 500, minStock: 100, unitPrice: 0.25, supplier: 'Packaging Pro' },
      { name: 'Garment Bags', category: 'Packaging', quantity: 200, minStock: 50, unitPrice: 0.50, supplier: 'Packaging Pro' },
      { name: 'Industrial Iron', category: 'Equipment', quantity: 5, minStock: 2, unitPrice: 299.99, supplier: 'Equipment World' },
      { name: 'Stain Remover', category: 'Other', quantity: 25, minStock: 10, unitPrice: 18.99, supplier: 'CleanCo Supplies' }
    ];

    for (const item of items) {
      for (const branchId of branchIds) {
        await db.collection('inventory').add({
          ...item,
          branchId: branchId,
          location: 'Main Storage',
          notes: 'Regular stock item',
          createdBy: 'admin-user-1',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    console.log(`Created inventory items for ${branchIds.length} branches`);

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
