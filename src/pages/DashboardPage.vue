<template>
  <q-page class="dashboard-page q-pa-md">
    <!-- Header -->
    <div class="dashboard-header q-mb-lg">
      <div>
        <div class="dashboard-title q-mb-xs">Dashboard</div>
        <div class="dashboard-subtitle">
          Welcome back, {{ userDisplayName }}! Here's what's happening today.
        </div>
      </div>
      <div class="dashboard-date">{{ currentDate }}</div>
    </div>

    <!-- Metrics Cards -->
    <div class="section-title q-mb-md">Key Metrics</div>
    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3" v-for="(metric, idx) in metrics" :key="idx">
        <q-card class="metric-card" :class="`metric-card-${metric.color}`">
          <q-card-section>
            <div class="row items-center justify-between">
              <div>
                <div class="metric-label">{{ metric.label }}</div>
                <div class="metric-value">{{ metric.value }}</div>
              </div>
              <q-icon :name="metric.icon" size="2.4rem" class="metric-icon" />
            </div>
            <div v-if="metric.sub" class="metric-sub">{{ metric.sub }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Charts / Insight Row -->
    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-md-8">
        <q-card class="glass-card">
          <q-card-section>
            <div class="text-h6 text-weight-bold q-mb-md" style="color: #4A2038;">Sales Overview</div>
            <div class="row q-col-gutter-sm">
              <div class="col-6 col-sm-3 text-center" v-for="(s, idx) in salesBreakdown" :key="idx">
                <div class="breakdown-value">{{ s.value }}</div>
                <div class="breakdown-label">{{ s.label }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="glass-card insight-card">
          <q-card-section>
            <div class="text-h6 text-weight-bold q-mb-md" style="color: #4A2038;">Top Service</div>
            <div class="top-service-name">{{ topService.name || 'N/A' }}</div>
            <div class="top-service-count">{{ topService.count }} orders</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section-title q-mb-md">Quick Actions</div>
    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-6 col-sm-3" v-for="(action, idx) in quickActions" :key="idx">
        <q-card class="action-card cursor-pointer" @click="action.handler" v-if="!action.admin || userStore.isAdmin">
          <q-card-section class="text-center">
            <q-icon :name="action.icon" size="2.8rem" class="action-icon" />
            <div class="action-label">{{ action.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Recent Sales -->
    <div class="section-title q-mb-md">Recent Sales</div>
    <q-card class="glass-card data-table">
      <q-table
        :rows="recentSales"
        :columns="salesColumns"
        row-key="id"
        flat
        :rows-per-page-options="[5]"
      >
        <template v-slot:body-cell-amount="props">
          <q-td :props="props">
            ${{ props.row.amount.toFixed(2) }}
          </q-td>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)" text-color="white" rounded>
              {{ props.row.status }}
            </q-badge>
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
import { db, collection, getDocs, query, orderBy, limit } from '../boot/firebase'
import { formatCurrency } from '../utils/currency'

const router = useRouter()
const userStore = useUserStore()

const todaySales = ref(0)
const weeklySales = ref(0)
const monthlySales = ref(0)
const totalOrders = ref(0)
const pendingOrders = ref(0)
const averageOrder = ref(0)
const totalBranches = ref(0)
const lowStockItems = ref(0)
const recentSales = ref([])
const currentMonthSales = ref([])
const topService = ref({ name: '', count: 0 })

const userDisplayName = computed(() => {
  return userStore.userData?.displayName || userStore.userData?.email || 'User'
})

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
})

const metrics = computed(() => [
  { label: 'Today\'s Sales', value: formatCurrency(todaySales.value), sub: 'Total revenue today', icon: 'payments', color: 'pink' },
  { label: 'This Week', value: formatCurrency(weeklySales.value), sub: 'Last 7 days', icon: 'calendar_today', color: 'rose' },
  { label: 'This Month', value: formatCurrency(monthlySales.value), sub: 'Monthly revenue', icon: 'trending_up', color: 'magenta' },
  { label: 'Avg. Order', value: formatCurrency(averageOrder.value), sub: `${totalOrders.value} orders`, icon: 'receipt', color: 'purple' },
  { label: 'Pending', value: pendingOrders.value, sub: 'Orders in progress', icon: 'hourglass_empty', color: 'coral' },
  { label: 'Low Stock', value: lowStockItems.value, sub: 'Items to restock', icon: 'warning', color: 'amber' },
  { label: 'Branches', value: totalBranches.value, sub: 'Active locations', icon: 'store', color: 'violet' },
  { label: 'Total Orders', value: totalOrders.value, sub: 'All-time orders', icon: 'shopping_bag', color: 'fuchsia' }
])

const salesBreakdown = computed(() => [
  { label: 'Today', value: formatCurrency(todaySales.value) },
  { label: 'Weekly', value: formatCurrency(weeklySales.value) },
  { label: 'Monthly', value: formatCurrency(monthlySales.value) },
  { label: 'Avg Order', value: formatCurrency(averageOrder.value) }
])

const quickActions = [
  { label: 'New Sale', icon: 'add_shopping_cart', handler: () => router.push('/dashboard/sales') },
  { label: 'Inventory', icon: 'inventory', handler: () => router.push('/dashboard/inventory') },
  { label: 'Add Branch', icon: 'add_business', handler: () => router.push('/dashboard/branches'), admin: true },
  { label: 'Print', icon: 'print', handler: () => printCurrentMonthSales() }
]

const salesColumns = [
  { name: 'customerName', label: 'Customer', field: 'customerName', align: 'left' },
  { name: 'service', label: 'Service', field: 'service', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'date', label: 'Date', field: 'date', align: 'left' }
]

function printCurrentMonthSales() {
  if (!currentMonthSales.value.length) return

  const headerHtml = salesColumns
    .map(col => `<th style="text-align:${col.align || 'left'}">${col.label}</th>`)
    .join('')

  const rowsHtml = currentMonthSales.value.map(row => {
    const cells = salesColumns.map(col => {
      let value = row[col.field]
      if (col.field === 'amount') value = formatCurrency(value || 0)
      return `<td style="text-align:${col.align || 'left'}">${value ?? ''}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const printContent = `
    <html>
      <head>
        <title>Current Month Sales</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #4A2038; }
          h2 { color: #E91E8C; margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #E91E8C; padding: 8px; font-size: 13px; }
          th { background: rgba(233, 30, 140, 0.1); font-weight: 700; }
        </style>
      </head>
      <body>
        <h2>Current Month Sales</h2>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  printWindow.document.open()
  printWindow.document.write(printContent)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function statusColor(status) {
  const map = {
    'Pending': 'amber-8',
    'In Progress': 'pink-5',
    'Ready': 'cyan-7',
    'Completed': 'green-6',
    'Cancelled': 'red-6'
  }
  return map[status] || 'grey-6'
}

async function loadDashboardData() {
  try {
    const today = new Date()
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(today.getDate() - 7)

    // Load recent sales
    const salesQuery = query(
      collection(db, 'sales'),
      orderBy('createdAt', 'desc'),
      limit(10)
    )
    const salesSnapshot = await getDocs(salesQuery)
    recentSales.value = salesSnapshot.docs.map(doc => ({
      ...doc.data(),
      date: doc.data().createdAt?.toDate()?.toLocaleDateString() || 'N/A'
    }))

    // Calculate totals from all sales
    const allSalesSnapshot = await getDocs(collection(db, 'sales'))
    const allSales = allSalesSnapshot.docs.map(doc => doc.data())

    totalOrders.value = allSales.length
    pendingOrders.value = allSales.filter(sale => sale.status === 'In Progress' || sale.status === 'Pending').length

    const amounts = allSales.map(sale => sale.amount || 0)
    averageOrder.value = allSales.length ? amounts.reduce((a, b) => a + b, 0) / allSales.length : 0

    todaySales.value = allSales
      .filter(sale => {
        const saleDate = sale.createdAt?.toDate()
        return saleDate && saleDate.toDateString() === today.toDateString()
      })
      .reduce((sum, sale) => sum + (sale.amount || 0), 0)

    weeklySales.value = allSales
      .filter(sale => {
        const saleDate = sale.createdAt?.toDate()
        return saleDate && saleDate >= lastWeek
      })
      .reduce((sum, sale) => sum + (sale.amount || 0), 0)

    currentMonthSales.value = allSales
      .filter(sale => {
        const saleDate = sale.createdAt?.toDate()
        return saleDate && saleDate >= thisMonth
      })
      .sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
      .map(sale => ({
        customerName: sale.customerName || '',
        service: sale.service || '',
        amount: sale.amount || 0,
        status: sale.status || '',
        date: sale.createdAt?.toDate()?.toLocaleDateString() || 'N/A'
      }))

    monthlySales.value = currentMonthSales.value
      .reduce((sum, sale) => sum + sale.amount, 0)

    // Top service
    const serviceCounts = {}
    allSales.forEach(sale => {
      const service = sale.service || 'Unknown'
      serviceCounts[service] = (serviceCounts[service] || 0) + 1
    })
    const topEntry = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]
    topService.value = topEntry ? { name: topEntry[0], count: topEntry[1] } : { name: '', count: 0 }

    // Load branches count
    const branchesSnapshot = await getDocs(collection(db, 'branches'))
    totalBranches.value = branchesSnapshot.size

    // Load low stock items
    const inventorySnapshot = await getDocs(collection(db, 'inventory'))
    lowStockItems.value = inventorySnapshot.docs
      .map(doc => doc.data())
      .filter(item => item.quantity <= (item.minStock || 10))
      .length
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
/* ===== Pink dashboard page ===== */
.dashboard-page {
  color: #4A2038;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 12px 4px;
}

.dashboard-title {
  font-size: 2.2rem;
  font-weight: 900;
  color: #4A2038;
  line-height: 1.1;
}

.dashboard-subtitle {
  font-size: 1rem;
  color: #8A4E71;
}

.dashboard-date {
  color: #E91E8C;
  font-weight: 600;
  font-size: 0.95rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: #4A2038;
}

/* ===== Glass cards ===== */
.glass-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(233, 30, 140, 0.12);
  border-radius: 24px;
  box-shadow: 0 12px 32px rgba(233, 30, 140, 0.1);
  backdrop-filter: blur(8px);
}

/* ===== Metric cards ===== */
.metric-card {
  border-radius: 22px;
  overflow: hidden;
  color: white;
  border: none;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.12);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.18);
}

.metric-card-pink    { background: linear-gradient(135deg, #E91E8C, #F06292); }
.metric-card-rose    { background: linear-gradient(135deg, #D81B60, #EC407A); }
.metric-card-magenta { background: linear-gradient(135deg, #C2185B, #D81B60); }
.metric-card-purple  { background: linear-gradient(135deg, #AD1457, #C2185B); }
.metric-card-coral   { background: linear-gradient(135deg, #FF4081, #F50057); }
.metric-card-amber   { background: linear-gradient(135deg, #FF9100, #FFCA28); color: #4A2038; }
.metric-card-violet  { background: linear-gradient(135deg, #7B1FA2, #9C27B0); }
.metric-card-fuchsia { background: linear-gradient(135deg, #E040FB, #D500F9); }

.metric-label {
  font-size: 0.85rem;
  opacity: 0.9;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 1.7rem;
  font-weight: 800;
}

.metric-sub {
  font-size: 0.75rem;
  opacity: 0.85;
  margin-top: 6px;
}

.metric-icon {
  opacity: 0.35;
}

/* ===== Sales breakdown ===== */
.breakdown-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: #E91E8C;
}

.breakdown-label {
  font-size: 0.8rem;
  color: #8A4E71;
  margin-top: 4px;
}

/* ===== Top service ===== */
.insight-card {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 160px;
}

.top-service-name {
  font-size: 1.6rem;
  font-weight: 800;
  color: #E91E8C;
}

.top-service-count {
  color: #8A4E71;
  margin-top: 4px;
}

/* ===== Quick actions ===== */
.action-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(233, 30, 140, 0.15);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(233, 30, 140, 0.1);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 34px rgba(233, 30, 140, 0.18);
}

.action-icon {
  color: #E91E8C;
  margin-bottom: 12px;
}

.action-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #4A2038;
}

/* ===== Table ===== */
.data-table {
  border-radius: 20px;
  overflow: hidden;
}

:deep(.q-table th) {
  background: rgba(233, 30, 140, 0.08);
  color: #4A2038;
  font-weight: 700;
}

:deep(.q-table td) {
  color: #4A2038;
}
</style>
