# Yoonek Laundry Shop Management System

A modern, full-featured laundry shop management system built with Quasar Framework, Express.js, and Firebase/Firestore.

## Features

- **Beautiful Animated Landing Page**: Modern design with smooth animations and unique branding
- **User Authentication**: Email/password and Google login support
- **Role-Based Access Control**: Admin and Staff roles with different permissions
- **Dashboard**: Real-time statistics and quick actions
- **Branch Management**: Create, read, update branches (Admin only)
- **Sales Management**: Complete sales tracking with filtering and reporting
  - Admin: View all sales
  - Staff: View monthly sales only
- **Inventory Management**: Track stock levels with low stock alerts
- **Profile Management**: Update user information and preferences
- **Print Reports**: Generate and print sales reports
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Quasar Framework (Vue 3)
- **Backend**: Express.js
- **Database**: Firebase/Firestore
- **Authentication**: Firebase Auth
- **State Management**: Pinia
- **Styling**: SCSS with custom animations

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd laundry-shop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Go to Firebase Console (https://console.firebase.google.com)
   - Create a new project or use existing one
   - Enable Authentication (Email/Password and Google providers)
   - Create Firestore Database
   - Generate Service Account Key:
     - Go to Project Settings → Service Accounts
     - Click "Generate New Private Key"
     - Save the JSON file as `server/firebase-service-account.json`
   - Update `.env` file with your Firebase credentials (already provided)

4. **Update Firebase Service Account**
   - Replace the placeholder values in `server/firebase-service-account.json` with your actual service account credentials

5. **Seed the database**
   ```bash
   node server/seed.js
   ```
   This will create:
   - 2 users (admin and staff)
   - 2 roles (admin and staff)
   - 2 branches
   - 20 sample sales records
   - Inventory items for each branch

## Running the Application

### Development Mode

Run both frontend and backend:
```bash
npm run dev:all
```

Or run separately:
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run server
```

### Production Build

```bash
npm run build
```

## Default Users

After seeding, you can login with:

**Admin User:**
- Email: admin@yooneklaundry.com
- Password: (You'll need to create this in Firebase Console)

**Staff User:**
- Email: staff@yooneklaundry.com
- Password: (You'll need to create this in Firebase Console)

To create passwords:
1. Go to Firebase Console → Authentication
2. Add users with the above emails
3. Set their passwords

## Project Structure

```
laundry-shop/
├── server/
│   ├── index.js              # Express server
│   ├── seed.js               # Database seeder
│   └── firebase-service-account.json  # Firebase admin credentials
├── src/
│   ├── boot/
│   │   └── firebase.js       # Firebase client initialization
│   ├── css/
│   │   └── app.scss          # Global styles and animations
│   ├── layouts/
│   │   ├── DashboardLayout.vue
│   │   └── LandingLayout.vue
│   ├── pages/
│   │   ├── LandingPage.vue
│   │   ├── LoginPage.vue
│   │   ├── DashboardPage.vue
│   │   ├── ProfilePage.vue
│   │   ├── BranchesPage.vue
│   │   ├── SalesPage.vue
│   │   ├── InventoryPage.vue
│   │   └── ErrorNotFound.vue
│   ├── router/
│   │   ├── index.js
│   │   └── routes.js
│   ├── stores/
│   │   └── user.js           # User state management
│   ├── App.vue
│   └── main.js
├── .env                      # Firebase credentials
├── package.json
├── quasar.config.js
└── README.md
```

## Features in Detail

### Landing Page
- Animated hero section with floating logo
- Feature cards with hover effects
- Service showcase
- Responsive design
- Modern gradient backgrounds

### Authentication
- Email/password login
- Google OAuth integration
- Session management
- Protected routes

### Dashboard
- Real-time statistics (daily sales, monthly sales, branches, low stock)
- Quick action buttons
- Recent sales table
- Role-based data display

### Branch Management (Admin Only)
- Create new branches
- Edit branch information
- Delete branches
- View all branches in a table

### Sales Management
- Create new sales records
- Edit existing sales
- Delete sales
- Filter by date, branch, and search
- Status tracking (Pending, In Progress, Ready, Completed)
- Print reports
- Role-based access (Admin: all time, Staff: current month only)

### Inventory Management
- Add inventory items
- Edit item details
- Stock adjustment (add/remove)
- Low stock alerts
- Filter by category, branch, and search
- Supplier information
- Storage location tracking

### Profile Management
- Update display name
- Update phone number
- Assign to branch (Admin can change)
- View role and email

## API Endpoints

### Branches
- `GET /api/branches` - Get all branches
- `POST /api/branches` - Create branch (Admin only)
- `PUT /api/branches/:id` - Update branch (Admin only)

### Sales
- `GET /api/sales` - Get sales (filtered by role)
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale

### Inventory
- `GET /api/inventory` - Get inventory
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile

## Color Scheme

- Primary: #0066CC (Blue)
- Secondary: #00B4D8 (Light Blue)
- Accent: #FF6B35 (Orange)
- Dark: #1A1A2E (Dark Blue)
- Light: #F8F9FA (Off White)
- Success: #00C853 (Green)
- Warning: #FFAB00 (Amber)
- Error: #FF5252 (Red)

## License

This project is proprietary and confidential.

## Support

For support, contact the development team.
