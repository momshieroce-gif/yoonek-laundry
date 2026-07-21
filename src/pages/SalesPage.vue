<template>
  <q-page class="sales-page q-pa-md">
    <!-- Header -->
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Sales</div>
        <div class="page-subtitle">Track and manage daily transactions</div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          label="Add Sale"
          icon="add"
          rounded
          unelevated
          class="add-btn"
          @click="showAddDialog = true"
        />
        <q-btn
          label="Print Report"
          icon="print"
          rounded
          outline
          class="print-btn"
          @click="printReport"
        />
      </div>
    </div>

    <!-- Filters -->
    <q-card class="filter-card q-pa-md q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-3">
          <q-input
            v-model="searchText"
            label="Search customer / service"
            outlined
            dense
            clearable
            class="sale-input"
          >
            <template v-slot:prepend>
              <q-icon name="search" color="pink-5" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-sm-3">
          <q-select
            v-model="selectedBranch"
            label="Branch"
            :options="branchOptions"
            outlined
            dense
            clearable
            emit-value
            map-options
            :disable="!userStore.isAdmin"
            class="sale-input"
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input
            v-model="startDate"
            label="Start Date"
            type="date"
            outlined
            dense
            class="sale-input"
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input
            v-model="endDate"
            label="End Date"
            type="date"
            outlined
            dense
            class="sale-input"
          />
        </div>
      </div>
    </q-card>

    <!-- Sales table -->
    <q-card class="glass-card data-table">
      <q-table
        :rows="filteredSales"
        :columns="salesColumns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-amount="props">
          <q-td :props="props" class="text-weight-bold">
            {{ formatCurrency(props.row.amount) }}
          </q-td>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="getStatusColor(props.row.status)" rounded class="status-badge">
              {{ props.row.status }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              icon="print"
              class="action-print"
              @click="printSale(props.row)"
            />
            <q-btn
              flat
              round
              dense
              icon="edit"
              class="action-edit"
              @click="editSale(props.row)"
            />
            <q-btn
              flat
              round
              dense
              icon="delete"
              class="action-delete"
              @click="deleteSale(props.row.id)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showAddDialog" class="sale-dialog">
      <q-card class="dialog-card">
        <q-card-section>
          <div class="dialog-title">{{ editingSale ? 'Edit Sale' : 'Add New Sale' }}</div>
          <div class="dialog-subtitle">Enter the sale details below</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleSaveSale" class="q-gutter-md">
            <q-select
              v-model="saleForm.branchId"
              label="Branch"
              :options="branchOptions"
              outlined
              dense
              emit-value
              map-options
              class="sale-input"
              :rules="[val => !!val || 'Branch is required']"
            />
            <q-input
              v-model="saleForm.customerName"
              label="Customer Name"
              outlined
              dense
              class="sale-input"
              :rules="[val => !!val || 'Customer name is required']"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="saleForm.customerPhone"
              label="Customer Phone"
              outlined
              dense
              class="sale-input"
            >
              <template v-slot:prepend>
                <q-icon name="phone" color="pink-5" />
              </template>
            </q-input>
            <q-select
              v-model="saleForm.service"
              label="Service Type"
              :options="serviceOptions"
              outlined
              dense
              class="sale-input"
              :rules="[val => !!val || 'Service type is required']"
            />
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model.number="saleForm.amount"
                  label="Amount"
                  type="number"
                  outlined
                  dense
                  class="sale-input"
                  style="margin-left: 15px"
                  :rules="[val => val > 0 || 'Amount must be greater than 0']"
                >
                  <template v-slot:prepend>
                    <q-icon name="fa-solid fa-peso-sign" color="pink-5" />
                  </template>
                </q-input>
              </div>
              <div class="col-6">
                <q-input
                  v-model="saleForm.weight"
                  label="Weight (kg)"
                  type="number"
                  outlined
                  dense
                  class="sale-input"
                >
                  <template v-slot:prepend>
                    <q-icon name="scale" color="pink-5" />
                  </template>
                </q-input>
              </div>
            </div>
            <q-select
              v-model="saleForm.status"
              label="Status"
              :options="statusOptions"
              outlined
              dense
              class="sale-input"
            />
            <q-input
              v-model="saleForm.notes"
              label="Notes"
              type="textarea"
              outlined
              dense
              rows="3"
              class="sale-input"
            />
            <div class="row justify-end q-mt-md">
              <q-btn flat rounded label="Cancel" v-close-popup class="cancel-btn q-mr-sm" />
              <q-btn type="submit" rounded unelevated label="Save" class="save-btn" :loading="loading" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from '../boot/firebase'
import { formatCurrency } from '../utils/currency'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (!userStore.isAuthenticated) {
    router.push('/login')
  }
})

const loading = ref(false)
const sales = ref([])
const branches = ref([])
const showAddDialog = ref(false)
const editingSale = ref(null)
const searchText = ref('')
const selectedBranch = ref('')
const startDate = ref('')
const endDate = ref('')

const salesColumns = [
  { name: 'customerName', label: 'Customer', field: 'customerName', align: 'left' },
  { name: 'service', label: 'Service', field: 'service', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { name: 'weight', label: 'Weight (kg)', field: 'weight', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'date', label: 'Date', field: 'date', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const serviceOptions = ['Wash & Fold', 'Dry Cleaning', 'Ironing', 'Premium Service']
const statusOptions = ['Pending', 'In Progress', 'Ready', 'Completed', 'Cancelled']

const branchOptions = computed(() => 
  branches.value.map(branch => ({
    label: branch.name,
    value: branch.id
  }))
)

const filteredSales = computed(() => {
  let result = sales.value

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(sale => 
      sale.customerName.toLowerCase().includes(search) ||
      sale.service.toLowerCase().includes(search)
    )
  }

  if (selectedBranch.value) {
    result = result.filter(sale => sale.branchId === selectedBranch.value)
  }

  if (startDate.value) {
    result = result.filter(sale => sale.date >= startDate.value)
  }

  if (endDate.value) {
    result = result.filter(sale => sale.date <= endDate.value)
  }

  return result
})

async function loadBranches() {
  try {
    const snapshot = await getDocs(collection(db, 'branches'))
    branches.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading branches:', error)
  }
}

async function loadSales() {
  loading.value = true
  try {
    let q = query(collection(db, 'sales'), orderBy('createdAt', 'desc'))
    
    // Staff can only see monthly sales
    if (userStore.isStaff) {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      q = query(collection(db, 'sales'), where('createdAt', '>=', firstDay), orderBy('createdAt', 'desc'))
    }

    const snapshot = await getDocs(q)
    sales.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().createdAt?.toDate()?.toLocaleDateString() || 'N/A'
    }))
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load sales: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function getStatusColor(status) {
  const colors = {
    'Pending': 'orange',
    'In Progress': 'blue',
    'Ready': 'green',
    'Completed': 'positive',
    'Cancelled': 'negative'
  }
  return colors[status] || 'grey'
}

const saleForm = ref({
  branchId: '',
  customerName: '',
  customerPhone: '',
  service: '',
  amount: 0,
  weight: 0,
  status: 'Pending',
  notes: ''
})

function editSale(sale) {
  editingSale.value = sale
  saleForm.value = {
    branchId: sale.branchId,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    service: sale.service,
    amount: sale.amount,
    weight: sale.weight,
    status: sale.status,
    notes: sale.notes
  }
  showAddDialog.value = true
}

async function handleSaveSale() {
  loading.value = true
  try {
    if (editingSale.value) {
      await updateDoc(doc(db, 'sales', editingSale.value.id), {
        ...saleForm.value,
        updatedAt: new Date()
      })
      $q.notify({
        type: 'positive',
        message: 'Sale updated successfully!'
      })
    } else {
      await addDoc(collection(db, 'sales'), {
        ...saleForm.value,
        createdBy: userStore.user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      $q.notify({
        type: 'positive',
        message: 'Sale added successfully!'
      })
    }
    showAddDialog.value = false
    editingSale.value = null
    resetForm()
    await loadSales()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save sale: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function deleteSale(id) {
  $q.dialog({
    title: 'Delete Sale',
    message: 'Are you sure you want to delete this sale?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await deleteDoc(doc(db, 'sales', id))
      $q.notify({
        type: 'positive',
        message: 'Sale deleted successfully!'
      })
      await loadSales()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Failed to delete sale: ' + error.message
      })
    }
  })
}

function resetForm() {
  saleForm.value = {
    branchId: '',
    customerName: '',
    customerPhone: '',
    service: '',
    amount: 0,
    weight: 0,
    status: 'Pending',
    notes: ''
  }
}

function printSale(sale) {
  const branch = branches.value.find(b => b.id === sale.branchId) || {}
  const addressLine = branch.address ? '<div>' + branch.address + '</div>' : ''
  const phoneLine = branch.phone ? '<div>' + branch.phone + '</div>' : ''
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { width: 80mm; font-family: 'Segoe UI', sans-serif; font-size: 12px; padding: 6mm; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .line { border-top: 1px dashed #000; margin: 4mm 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2mm; }
          .spacer { height: 4mm; }
        </style>
      </head>
      <body onload="window.print(); window.onafterprint = () => window.close()">
        <div class="center">
          <div class="bold" style="font-size: 16px;">${branch.name || 'Yoonek Laundry'}</div>
          ${addressLine}
          ${phoneLine}
        </div>
        <div class="spacer"></div>
        <div class="line"></div>
        <div class="row"><span>Date:</span><span>${sale.date}</span></div>
        <div class="row"><span>Customer:</span><span>${sale.customerName}</span></div>
        <div class="row"><span>Service:</span><span>${sale.service}</span></div>
        <div class="line"></div>
        <div class="row"><span>Amount:</span><span>${formatCurrency(sale.amount)}</span></div>
        <div class="row"><span>Weight:</span><span>${sale.weight || 0} kg</span></div>
        <div class="row"><span>Status:</span><span>${sale.status}</span></div>
        <div class="line"></div>
        <div class="center">Thank you!</div>
      </body>
    </html>
  `
  const printWindow = window.open('', '_blank', 'width=300,height=600')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
  }
}

function printReport() {
  window.print()
}

onMounted(() => {
  selectedBranch.value = userStore.userData?.branchId || ''
  loadBranches()
  loadSales()
})
</script>

<style scoped>
/* ===== Pink sales page ===== */
.sales-page {
  color: #4A2038;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 12px 4px;
}

.page-title {
  font-size: 2.2rem;
  font-weight: 900;
  color: #4A2038;
  line-height: 1.1;
}

.page-subtitle {
  font-size: 1rem;
  color: #8A4E71;
  margin-top: 4px;
}

.add-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  font-weight: 700;
  padding: 0 20px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.35);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(233, 30, 140, 0.45);
}

.print-btn {
  color: #E91E8C;
  border-color: rgba(233, 30, 140, 0.4);
  font-weight: 700;
  padding: 0 20px;
}

.print-btn:hover {
  background: rgba(233, 30, 140, 0.08);
}

/* ===== Filter card ===== */
.filter-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(233, 30, 140, 0.12);
  border-radius: 22px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.1);
  backdrop-filter: blur(8px);
}

.sale-input :deep(.q-field__control) {
  border-radius: 14px;
}

.sale-input :deep(.q-field__control::before) {
  border-color: rgba(233, 30, 140, 0.35);
}

.sale-input :deep(.q-field--focused .q-field__control::after) {
  border-color: #E91E8C;
}

/* ===== Table ===== */
.glass-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(233, 30, 140, 0.12);
  border-radius: 24px;
  box-shadow: 0 12px 32px rgba(233, 30, 140, 0.1);
  backdrop-filter: blur(8px);
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

.status-badge {
  padding: 4px 10px;
  font-size: 0.8rem;
}

.action-edit {
  color: #E91E8C;
  transition: transform 0.2s ease;
}

.action-edit:hover {
  transform: scale(1.15);
  background: rgba(233, 30, 140, 0.1);
}

.action-delete {
  color: #E91E8C;
  transition: transform 0.2s ease;
}

.action-delete:hover {
  transform: scale(1.15);
  color: #C2185B;
  background: rgba(233, 30, 140, 0.1);
}

.action-print {
  color: #E91E8C;
  transition: transform 0.2s ease;
}

.action-print:hover {
  transform: scale(1.15);
  background: rgba(233, 30, 140, 0.1);
}

/* ===== Dialog ===== */
.sale-dialog :deep(.q-dialog__backdrop) {
  background: rgba(74, 32, 56, 0.45);
  backdrop-filter: blur(4px);
}

.dialog-card {
  min-width: 520px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  box-shadow: 0 30px 70px rgba(233, 30, 140, 0.25);
}

.dialog-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #4A2038;
}

.dialog-subtitle {
  font-size: 0.9rem;
  color: #8A4E71;
}

.cancel-btn {
  color: #8A4E71;
  font-weight: 600;
}

.save-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  font-weight: 700;
  padding: 0 22px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.35);
  transition: transform 0.25s ease;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(233, 30, 140, 0.45);
}
</style>
