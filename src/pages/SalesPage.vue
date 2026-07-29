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
          @click="openAddDialog"
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
            :min="minDate"
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
            :min="minDate"
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
            {{ formatCurrency(props.row.total ?? props.row.amount) }}
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
              @update:model-value="onBranchChange"
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
            <div class="row q-col-gutter-md items-center">
              <div class="col-9">
                <q-select
                  v-model="selectedService"
                  label="Service Type"
                  :options="serviceOptions"
                  outlined
                  dense
                  class="sale-input"
                  option-label="label"
                  option-value="value"
                  emit-value
                  map-options
                  @update:model-value="onServiceSelect"
                />
              </div>
              <div class="col-3">
                <q-btn
                  label="Add"
                  icon="add"
                  unelevated
                  class="save-btn"
                  @click="addService"
                  :disable="!selectedService"
                />
              </div>
            </div>
           
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model.number="saleForm.amount"
                  label="Amount"
                  type="number"
                  step="0.01"
                  outlined
                  dense
                  class="sale-input"
                  style="margin-left: 15px"
                  :disable="saleForm.services.length > 0"
                  :rules="[val => val > 0 || 'Amount must be greater than 0']"
                >
                  <template v-slot:prepend>
                    <q-icon name="fa-solid fa-peso-sign" color="pink-5" />
                  </template>
                </q-input>
              </div>
              <div class="col-6">
                <q-input
                  v-model.number="saleForm.weight"
                  :label="unitLabel"
                  type="number"
                  outlined
                  dense
                  class="sale-input"
                  @update:model-value="recomputeAmount"
                >
                  <template v-slot:prepend>
                    <q-icon name="scale" color="pink-5" />
                  </template>
                </q-input>
              </div>
            </div>
             <q-list v-if="saleForm.services.length" class="q-mb-md">
              <q-item v-for="(service, idx) in saleForm.services" :key="service.name + idx">
                <q-item-section>
                  <q-item-label>{{ service.name }} <span class="text-weight-bold">{{ formatCurrency(service.price) }}</span></q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat round dense icon="remove" color="negative" @click="removeService(idx)" />
                </q-item-section>
              </q-item>
            </q-list>
            
            <div class="row q-col-gutter-md items-center">
              <div class="col-9">
                <q-select
                  v-model="selectedInventory"
                  label="Add Sale Items"
                  :options="inventoryOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="sale-input"
                  style="margin-left: 15px"
                />
              </div>
              <div class="col-3">
                <q-btn
                  label="Add"
                  icon="add"
                  unelevated
                  class="save-btn"
                  @click="addInventoryItem"
                  :disable="!selectedInventory"
                />
              </div>
            </div>

            <q-list v-if="saleItems.length" class="q-mb-md">
              <q-item v-for="group in groupedSaleItems" :key="group.name">
                <q-item-section>
                  <q-item-label>{{ group.name }} <span class="text-weight-bold">x {{ group.count }}</span></q-item-label>
                  <q-item-label caption>{{ formatCurrency(group.price * group.count) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat round dense icon="remove" color="negative" @click="removeInventoryItem(group.name)" />
                </q-item-section>
              </q-item>
            </q-list>
            
            <div
              class="text-right q-pa-md q-mb-md text-white"
              style="
                background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
                border-radius: 18px;
                box-shadow: 0 10px 28px rgba(233, 30, 140, 0.35);
              "
            >
              <div class="text-caption" style="opacity: 0.9;">Overall Total</div>
              <div class="text-h5 text-weight-bold">{{ formatCurrency(overallTotal) }}</div>
            </div>
            <q-select
              v-model="saleForm.paymentType"
              label="Payment Type"
              :options="paymentTypeOptions"
              outlined
              dense
              class="sale-input"
            />
            <q-select
              v-model="saleForm.paymentStatus"
              label="Payment Status"
              :options="paymentStatusOptions"
              outlined
              dense
              class="sale-input"
            />
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { db, collection, getDocs, addDoc, setDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from '../boot/firebase'
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
const inventory = ref([])
const selectedInventory = ref(null)
const selectedService = ref('')
const saleItems = ref([])
const showAddDialog = ref(false)
const editingSale = ref(null)
const searchText = ref('')
const selectedBranch = ref('')
const startDate = ref('')
const endDate = ref('')

const minDate = computed(() => {
  if (userStore.isAdmin) return undefined
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
})

const salesColumns = [
  { name: 'customerName', label: 'Customer', field: 'customerName', align: 'left' },
  { name: 'service', label: 'Service', field: row => {
    const arr = Array.isArray(row.service) ? row.service : (row.service ? [row.service] : [])
    const names = arr.map(s => getServiceName(s))
    if (!names.length) return ''
    if (names.length === 1) return names[0]
    return `${names[0]}, ...`
  }, align: 'left' },
  { name: 'amount', label: 'Total', field: row => row.total ?? row.amount, align: 'right' },
  { name: 'weight', label: 'Weight (kg)', field: 'weight', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'date', label: 'Date', field: 'date', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const serviceTypes = ref([])
const statusOptions = ['Pending', 'In Progress', 'Ready', 'Completed', 'Cancelled']
const paymentStatusOptions = ['Paid', 'Unpaid']
const paymentTypeOptions = ['Cash', 'Gcash', 'Bank Transfer']

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

async function loadServiceTypes() {
  try {
    const snapshot = await getDocs(collection(db, 'service_types'))
    serviceTypes.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading service types:', error)
  }
}

async function loadInventory() {
  try {
    const snapshot = await getDocs(collection(db, 'inventory'))
    inventory.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading inventory:', error)
  }
}

async function loadSales() {
  loading.value = true
  try {
    const constraints = [orderBy('createdAt', 'desc')]

    if (startDate.value) {
      const start = new Date(startDate.value)
      start.setHours(0, 0, 0, 0)
      constraints.push(where('createdAt', '>=', start))
    }

    if (endDate.value) {
      const end = new Date(endDate.value)
      end.setHours(23, 59, 59, 999)
      constraints.push(where('createdAt', '<=', end))
    }

    const q = query(collection(db, 'sales'), ...constraints)

    const snapshot = await getDocs(q)
    sales.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().createdAt?.toDate()?.toLocaleDateString('en-CA') || 'N/A'
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

watch([startDate, endDate], () => {
  loadSales()
})

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
  services: [],
  amount: 0,
  weight: 0,
  status: 'Pending',
  paymentStatus: 'Unpaid',
  paymentType: 'Cash',
  notes: ''
})

const serviceOptions = computed(() => {
  const branchId = saleForm.value.branchId
  return serviceTypes.value
    .filter(st => !branchId || st.branchId === branchId)
    .map(st => ({
      label: `${st.name} - ${formatCurrency(Number(st.price || 0))}`,
      value: st.name
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const inventoryOptions = computed(() => {
  const branchId = saleForm.value.branchId
  return inventory.value
    .filter(item => !branchId || item.branchId === branchId)
    .map(item => ({
      label: `${item.name} - ${formatCurrency(item.unitPrice)}`,
      value: { name: item.name, price: item.unitPrice }
    }))
})

function onBranchChange() {
  saleForm.value.services = []
  saleForm.value.amount = 0
  saleItems.value = []
  selectedInventory.value = null
  selectedService.value = ''
}

const unitLabel = computed(() => {
  const name = selectedService.value || (saleForm.value.services.length ? saleForm.value.services[0].name : null)
  const serviceType = name ? getServiceType(name) : null
  const unit = serviceType?.unit
  return unit ? `Unit (${unit})` : 'Unit'
})

function getServiceName(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    if (typeof value.name === 'string') return value.name
    if (typeof value.children === 'string') return value.children
    if (typeof value.value === 'string') return value.value
  }
  return ''
}

function recomputeAmount() {
  const name = getServiceName(selectedService.value)
  saleForm.value.amount = name
    ? getServiceTotal(name)
    : 0
}

function onServiceSelect(value) {
  const name = getServiceName(value)
  const branchId = saleForm.value.branchId
  const st = serviceTypes.value.find(s => s.name === name && (!branchId || s.branchId === branchId))
  if (st) {
    saleForm.value.weight = Number(st.minimumPerUnit) || 1
    recomputeAmount()
  }
}

function addService() {
  const name = getServiceName(selectedService.value)
  if (!name) return
  const price = getServiceTotal(name)
  saleForm.value.services.push({ name, price })
  selectedService.value = ''
  saleForm.value.amount = 0
  saleForm.value.weight = 0
}

function removeService(index) {
  saleForm.value.services.splice(index, 1)
  recomputeAmount()
}

function getServiceType(name) {
  const branchId = saleForm.value.branchId
  return serviceTypes.value.find(st =>
    st.name === name && (!branchId || st.branchId === branchId)
  ) || null
}

function getServiceTotal(name) {
  const serviceType = getServiceType(name)
  const weight = Number(saleForm.value.weight) || 0
  if (!serviceType) return 0
  const min = Number(serviceType.minimumPerUnit) > 1 ? Number(serviceType.minimumPerUnit) : 1
  const price = Number(serviceType.price) || 0
  return Number(((price * weight) / min).toFixed(2))
}

const overallTotal = computed(() =>
  saleForm.value.services.reduce((sum, service) => sum + Number(service.price || 0), 0) +
  saleItems.value.reduce((sum, item) => sum + Number(item.price || 0), 0)
)

const groupedSaleItems = computed(() => {
  const groups = {}
  saleItems.value.forEach(item => {
    if (!groups[item.name]) {
      groups[item.name] = { name: item.name, count: 1, price: item.price }
    } else {
      groups[item.name].count++
    }
  })
  return Object.values(groups)
})

function addInventoryItem() {
  if (!selectedInventory.value) return
  saleItems.value.push({ ...selectedInventory.value })
  selectedInventory.value = null
}

function removeInventoryItem(name) {
  const idx = saleItems.value.findIndex(item => item.name === name)
  if (idx !== -1) {
    saleItems.value.splice(idx, 1)
  }
}

function editSale(sale) {
  editingSale.value = sale
  const rawServices = Array.isArray(sale.service) ? sale.service : (sale.service ? [sale.service] : [])
  const services = rawServices
    .map(item => {
      const name = getServiceName(item)
      if (!name) return null
      const price = typeof item === 'object' && item !== null ? Number(item.price || 0) : 0
      return { name, price }
    })
    .filter(Boolean)
  saleForm.value = {
    branchId: sale.branchId,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    services,
    amount: sale.amount,
    weight: sale.weight,
    status: sale.status,
    paymentStatus: sale.paymentStatus,
    paymentType: sale.paymentType,
    notes: sale.notes
  }
  saleForm.value.services.forEach(service => {
    if (!service.price) service.price = getServiceTotal(service.name)
  })
  saleItems.value = Array.isArray(sale.items) ? sale.items.map(item => ({ ...item })) : []
  showAddDialog.value = true
}

async function handleSaveSale() {
  loading.value = true
  try {
    const isEditing = !!editingSale.value
    let writePromise

    const saleDocRef = isEditing
      ? doc(db, 'sales', editingSale.value.id)
      : doc(collection(db, 'sales'))

    const { services, ...formData } = saleForm.value
    const serviceRecords = services
      .map(s => ({ name: getServiceName(s.name), price: Number(s.price || 0) }))
      .filter(s => s.name)
    const serviceTotal = serviceRecords.reduce((sum, s) => sum + Number(s.price || 0), 0)

    if (isEditing) {
      writePromise = updateDoc(saleDocRef, {
        ...formData,
        service: serviceRecords,
        amount: serviceTotal,
        items: saleItems.value,
        total: overallTotal.value,
        updatedAt: new Date()
      })
    } else {
      writePromise = setDoc(saleDocRef, {
        ...formData,
        service: serviceRecords,
        amount: serviceTotal,
        items: saleItems.value,
        total: overallTotal.value,
        createdBy: userStore.user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    writePromise.catch(err => console.warn('Queued sale failed to sync:', err))

    // If the server doesn't confirm within 3s, the write is queued locally
    // (IndexedDB) and will upload automatically when internet is available.
    const result = await Promise.race([
      writePromise.then(() => 'synced'),
      new Promise(resolve => setTimeout(() => resolve('queued'), 3000))
    ])

    if (result === 'synced') {
      $q.notify({
        type: 'positive',
        message: isEditing ? 'Sale updated successfully!' : 'Sale added successfully!'
      })
    } else {
      $q.notify({
        type: 'warning',
        message: 'No internet detected. Sale saved locally and will upload automatically when back online.'
      })
    }

    // Deduct selected inventory quantities from stock and record stock out transactions
    const wasCompleted = editingSale.value?.status === 'Completed'
    if (saleForm.value.status === 'Completed' && !wasCompleted) {
      const branchId = saleForm.value.branchId
      const saleBranch = branches.value.find(b => b.id === branchId)
      groupedSaleItems.value.forEach(group => {
        const invItem = inventory.value.find(inv => inv.name === group.name && inv.branchId === branchId)
        if (invItem) {
          const current = Number(invItem.currentStock) || 0
          const newStock = Math.max(0, current - group.count)
          invItem.currentStock = newStock
          updateDoc(doc(db, 'inventory', invItem.id), {
            currentStock: newStock,
            updatedAt: new Date()
          }).catch(err => console.warn('Inventory deduction failed for', group.name, err))
        }

        addDoc(collection(db, 'inventory_transactions'), {
          branchId,
          branchName: saleBranch ? saleBranch.name : 'Unknown Branch',
          saleId: saleDocRef.id,
          inventoryItemId: invItem ? invItem.id : '',
          inventoryItemName: group.name,
          transactionType: 'Stock Out',
          quantity: group.count,
          date: new Date().toISOString().split('T')[0],
          notes: 'From Sales',
          createdBy: userStore.user.uid,
          createdAt: new Date(),
          updatedAt: new Date()
        }).catch(err => console.warn('Failed to create stock out transaction for', group.name, err))
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
      const inventoryQuery = query(collection(db, 'inventory_transactions'), where('saleId', '==', id))
      const snapshot = await getDocs(inventoryQuery)
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'inventory_transactions', d.id)))
      await Promise.all(deletePromises)
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

function openAddDialog() {
  editingSale.value = null
  resetForm()
  showAddDialog.value = true
}

function resetForm() {
  saleForm.value = {
    branchId: '',
    customerName: '',
    customerPhone: '',
    services: [],
    amount: 0,
    weight: 0,
    status: 'Pending',
    paymentStatus: 'Unpaid',
    paymentType: 'Cash',
    notes: ''
  }
  saleItems.value = []
  selectedInventory.value = null
  selectedService.value = ''
}

function printSale(sale) {
  const branch = branches.value.find(b => b.id === sale.branchId) || {}
  const addressLine = branch.address ? '<div>' + branch.address + '</div>' : ''
  const phoneLine = branch.phone ? '<div>' + branch.phone + '</div>' : ''

  const items = Array.isArray(sale.items) ? sale.items : []
  const itemGroups = {}
  items.forEach(item => {
    if (!itemGroups[item.name]) {
      itemGroups[item.name] = { name: item.name, count: 1, price: Number(item.price || 0) }
    } else {
      itemGroups[item.name].count++
    }
  })
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0)
  const itemRows = Object.values(itemGroups)
    .map(group => `<div class="row"><span>${group.name} x ${group.count}</span><span>${formatCurrency(group.price * group.count)}</span></div>`)
    .join('')
  const itemsSection = itemRows
    ? `<div class="line"></div>
        <div class="bold">Items</div>
        ${itemRows}`
    : ''
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
          <img src="${window.location.origin}/logoPrint.png" alt="Logo" style="width: 20mm; height: auto; margin-bottom: 2mm;" />
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
        ${itemsSection}
        <div class="line"></div>
        <div class="row bold"><span>Total:</span><span>${formatCurrency(Number(sale.amount || 0) + itemsTotal)}</span></div>
        <div class="line"></div>
        <div class="center">Thank you!</div>
      </body>
    </html>
  `
  const printWindow = window.open('', '_blank', `left=0,top=0,width=${screen.availWidth},height=${screen.availHeight}`)
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.moveTo(0, 0)
    printWindow.resizeTo(screen.availWidth, screen.availHeight)
    printWindow.focus()
  }
}

function printReport() {
  const branch = branchOptions.value.find(b => b.value === selectedBranch.value)?.label || 'All Branches'
  const reportColumns = salesColumns.filter(c => c.name !== 'actions')
  const headerHtml = reportColumns.map(c => `<th>${c.label}</th>`).join('')
  const rowsHtml = filteredSales.value.map(sale => {
    const cells = reportColumns.map(c => {
      let val = sale[c.field] ?? ''
      if (c.name === 'amount') val = formatCurrency(sale.amount)
      return `<td>${val}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sales Report</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 24px; color: #4A2038; }
        h2 { margin: 0 0 8px; color: #E91E8C; }
        .meta { margin-bottom: 16px; font-size: 14px; color: #8A4E71; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #FDD3E8; }
        th { background: #FFF5FA; color: #E91E8C; font-weight: 700; }
      </style>
    </head>
    <body onload="window.print(); window.onafterprint = () => window.close()">
      <h2>Sales Report</h2>
      <div class="meta">
        Branch: ${branch}<br>
        Period: ${startDate.value || 'All'} to ${endDate.value || 'All'}
      </div>
      <table>
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body>
    </html>
  `
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
  }
}

onMounted(() => {
  selectedBranch.value = userStore.userData?.branchId || ''

  if (!userStore.isAdmin) {
    const now = new Date()
    startDate.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    endDate.value = now.toISOString().split('T')[0]
  }

  loadBranches()
  loadServiceTypes()
  loadInventory()
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
