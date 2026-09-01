const routes = [
  {
    path: '/',
    component: () => import('layouts/LandingLayout.vue'),
    children: [
      { path: '', component: () => import('pages/LoginPage.vue') }
    ]
  },
  {
    path: '/login',
    component: () => import('layouts/LandingLayout.vue'),
    children: [
      { path: '', component: () => import('pages/LoginPage.vue') }
    ]
  },
  {
    path: '/dashboard',
    component: () => import('layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('pages/DashboardPage.vue') },
      { path: 'dashboard', component: () => import('pages/DashboardPage.vue') },
      { path: 'profile', component: () => import('pages/ProfilePage.vue') },
      { path: 'accounts', component: () => import('pages/AccountsPage.vue'), meta: { adminOnly: true } },
      { path: 'journal-entries', component: () => import('pages/JournalEntriesPage.vue'), meta: { adminOnly: true } },
      { path: 'branches', component: () => import('pages/BranchesPage.vue') },
      { path: 'sales', component: () => import('pages/SalesPage.vue') },
      { path: 'inventory', component: () => import('pages/InventoryPage.vue') },
      { path: 'inventory-transactions', component: () => import('pages/InventoryTransactionsPage.vue') },
      { path: 'sale-items', component: () => import('pages/SaleItemPage.vue') },
      { path: 'users', component: () => import('pages/UsersPage.vue'), meta: { adminOnly: true } },
      { path: 'attendance', component: () => import('pages/AttendancePage.vue') },
      { path: 'cash-advances', component: () => import('pages/CashAdvancesPage.vue'), meta: { adminOnly: true } },
      { path: 'employee-salaries', component: () => import('pages/EmployeeSalaryPage.vue'), meta: { adminOnly: true } },
      { path: 'expenses', component: () => import('pages/ExpensesPage.vue') }
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
