<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-weight-bold q-mb-md">Dashboard</div>
    <div class="text-body1 text-grey-6 q-mb-xl">
      Welcome back, {{ userStore.userData?.displayName || userStore.user?.email }}!
    </div>

    <!-- Stats Cards -->
    <div class="row q-gutter-md q-mb-xl">
      <div class="col-12 col-sm-3">
        <q-card class="card-hover">
          <q-card-section class="bg-primary text-white">
            <div class="text-subtitle2">Total Sales Today</div>
            <div class="text-h4 text-weight-bold">${{ todaySales }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-3">
        <q-card class="card-hover">
          <q-card-section class="bg-secondary text-white">
            <div class="text-subtitle2">Monthly Sales</div>
            <div class="text-h4 text-weight-bold">${{ monthlySales }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-3">
        <q-card class="card-hover">
          <q-card-section class="bg-accent text-white">
            <div class="text-subtitle2">Total Branches</div>
            <div class="text-h4 text-weight-bold">{{ totalBranches }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-3">
        <q-card class="card-hover">
          <q-card-section class="bg-green text-white">
            <div class="text-subtitle2">Low Stock Items</div>
            <div class="text-h4 text-weight-bold">{{ lowStockItems }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="text-h5 text-weight-bold q-mb-md">Quick Actions</div>
    <div class="row q-gutter-md q-mb-xl">
      <div class="col-12 col-sm-3">
        <q-card class="card-hover cursor-pointer" @click="goToSales">
          <q-card-section class="text-center">
            <q-icon name="add_shopping_cart" size="3rem" color="primary" class="q-mb-md" />
            <div class="text-h6">New Sale</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-3">
        <q-card class="card-hover cursor-pointer" @click="goToInventory">
          <q-card-section class="text-center">
            <q-icon name="inventory" size="3rem" color="secondary" class="q-mb-md" />
            <div class="text-h6">Add Inventory</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-3" v-if="userStore.isAdmin">
        <q-card class="card-hover cursor-pointer" @click="goToBranches">
          <q-card-section class="text-center">
            <q-icon name="add_business" size="3rem" color="accent" class="q-mb-md" />
            <div class="text-h6">Add Branch</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-3">
        <q-card class="card-hover cursor-pointer" @click="printReport">
          <q-card-section class="text-center">
            <q-icon name="print" size="3rem" color="green" class="q-mb-md" />
            <div class="text-h6">Print Report</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Recent Sales -->
    <div class="text-h5 text-weight-bold q-mb-md">Recent Sales</div>
    <q-card class="data-table">
      <q-table
        :rows="recentSales"
        :columns="salesColumns"
        row-key="id"
        flat
        bordered
      >
        <template v-slot:body-cell-amount="props">
          <q-td :props="props">
            ${{ props.row.amount.toFixed(2) }}
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { db, collection, getDocs, query, where, orderBy, limit } from '../boot/firebase'

const router = useRouter()
const userStore = useUserStore()
const isCheckingAuth = ref(true)

onMounted(async () => {
  // Small delay to ensure Pinia is fully initialized
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (!userStore.isAuthenticated) {
    router.push('/login')
  }
  isCheckingAuth.value = false
})

const todaySales = ref(0)
const monthlySales = ref(0)
const totalBranches = ref(0)
const lowStockItems = ref(0)
const recentSales = ref([])

const salesColumns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'customerName', label: 'Customer', field: 'customerName', align: 'left' },
  { name: 'service', label: 'Service', field: 'service', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { name: 'date', label: 'Date', field: 'date', align: 'left' }
]

async function loadDashboardData() {
  try {
    // Load recent sales
    const salesQuery = query(
      collection(db, 'sales'),
      orderBy('createdAt', 'desc'),
      limit(5)
    )
    const salesSnapshot = await getDocs(salesQuery)
    recentSales.value = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().createdAt?.toDate()?.toLocaleDateString() || 'N/A'
    }))

    // Calculate totals
    const allSalesSnapshot = await getDocs(collection(db, 'sales'))
    const allSales = allSalesSnapshot.docs.map(doc => doc.data())
    
    const today = new Date()
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    todaySales.value = allSales
      .filter(sale => {
        const saleDate = sale.createdAt?.toDate()
        return saleDate && saleDate.toDateString() === today.toDateString()
      })
      .reduce((sum, sale) => sum + (sale.amount || 0), 0)
    
    monthlySales.value = allSales
      .filter(sale => {
        const saleDate = sale.createdAt?.toDate()
        return saleDate && saleDate >= thisMonth
      })
      .reduce((sum, sale) => sum + (sale.amount || 0), 0)

    // Load branches count
    const branchesSnapshot = await getDocs(collection(db, 'branches'))
    totalBranches.value = branchesSnapshot.size

    // Load low stock items
    const inventorySnapshot = await getDocs(collection(db, 'inventory'))
    lowStockItems.value = inventorySnapshot.docs
      .map(doc => doc.data())
      .filter(item => item.quantity <= item.minStock || 10)
      .length
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
}

function goToSales() {
  router.push('/dashboard/sales')
}

function goToInventory() {
  router.push('/dashboard/inventory')
}

function goToBranches() {
  router.push('/dashboard/branches')
}

function printReport() {
  window.print()
}

onMounted(() => {
  loadDashboardData()
})
</script>
