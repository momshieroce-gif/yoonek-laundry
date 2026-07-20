const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.use(cors());
app.use(express.json());

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Check user role
const checkRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userData = userDoc.data();
      if (userData.role !== requiredRole && userData.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.userData = userData;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

// Branch routes
app.get('/api/branches', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('branches').get();
    const branches = [];
    snapshot.forEach(doc => branches.push({ id: doc.id, ...doc.data() }));
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/branches', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const branchData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('branches').add(branchData);
    res.json({ id: docRef.id, ...branchData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/branches/:id', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const branchData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('branches').doc(req.params.id).update(branchData);
    res.json({ id: req.params.id, ...branchData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sales routes
app.get('/api/sales', verifyToken, async (req, res) => {
  try {
    let query = db.collection('sales');
    
    // Filter by role
    if (req.userData.role === 'staff') {
      // Staff can only see monthly sales
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query.where('createdAt', '>=', firstDay);
    }
    
    // Filter by branch if specified
    if (req.query.branchId) {
      query = query.where('branchId', '==', req.query.branchId);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const sales = [];
    snapshot.forEach(doc => sales.push({ id: doc.id, ...doc.data() }));
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', verifyToken, async (req, res) => {
  try {
    const salesData = {
      ...req.body,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('sales').add(salesData);
    res.json({ id: docRef.id, ...salesData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sales/:id', verifyToken, async (req, res) => {
  try {
    const salesData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('sales').doc(req.params.id).update(salesData);
    res.json({ id: req.params.id, ...salesData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inventory routes
app.get('/api/inventory', verifyToken, async (req, res) => {
  try {
    let query = db.collection('inventory');
    
    if (req.query.branchId) {
      query = query.where('branchId', '==', req.query.branchId);
    }
    
    const snapshot = await query.orderBy('name', 'asc').get();
    const inventory = [];
    snapshot.forEach(doc => inventory.push({ id: doc.id, ...doc.data() }));
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory', verifyToken, async (req, res) => {
  try {
    const inventoryData = {
      ...req.body,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection('inventory').add(inventoryData);
    res.json({ id: docRef.id, ...inventoryData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventory/:id', verifyToken, async (req, res) => {
  try {
    const inventoryData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('inventory').doc(req.params.id).update(inventoryData);
    res.json({ id: req.params.id, ...inventoryData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User profile routes
app.get('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', verifyToken, async (req, res) => {
  try {
    if (req.params.id !== req.user.uid && req.userData.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const userData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc(req.params.id).update(userData);
    res.json({ id: req.params.id, ...userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
