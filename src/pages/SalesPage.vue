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
        <div class="col-12 col-sm-3">
          <q-input
            v-model="startTime"
            label="Start Time"
            type="time"
            outlined
            dense
            class="sale-input"
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input
            v-model="endTime"
            label="End Time"
            type="time"
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
        <template v-slot:body-cell-paymentStatus="props">
          <q-td :props="props">
            <q-badge
              rounded
              class="payment-badge"
              :class="props.row.paymentStatus === 'Paid' ? 'payment-badge--paid' : 'payment-badge--unpaid'"
            >
              {{ props.row.paymentStatus || 'Unpaid' }}
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
              :disable="!userStore.isAdmin"
              :rules="[val => !!val || 'Branch is required']"
              @update:model-value="onBranchChange"
            />
            <q-input
              v-model="saleForm.invoiceNo"
              label="Invoice No"
              outlined
              dense
              class="sale-input"
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
              style="margin-top: 0px;"
            >
              <template v-slot:prepend>
                <q-icon name="phone" color="pink-5" />
              </template>
            </q-input>
            <div class="row q-col-gutter-md items-center" style="padding-left:15px; padding-top: 10px; padding-bottom: 10px;">
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
              <div class="col">
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
            <div v-if="saleForm.paymentType === 'Cash'" class="cash-panel q-mb-md">
              <q-input
                v-model.number="saleForm.enterAmount"
                label="Enter Amount"
                type="number"
                step="0.01"
                outlined
                dense
                class="sale-input cash-panel__input"
              >
                <template v-slot:prepend>
                  <q-icon name="fa-solid fa-peso-sign" color="pink-5" />
                </template>
              </q-input>
              <div class="cash-panel__change" :class="changeAmount < 0 ? 'cash-panel__change--negative' : 'cash-panel__change--positive'">
                <div class="cash-panel__label">
                  <q-icon :name="changeAmount < 0 ? 'error_outline' : 'check_circle'" size="18px" />
                  {{ changeAmount < 0 ? 'Insufficient Amount' : 'Change' }}
                </div>
                <div class="cash-panel__value">{{ formatCurrency(Math.abs(changeAmount)) }}</div>
              </div>
            </div>
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
              <q-btn
                type="submit"
                rounded
                unelevated
                :label="editingSale ? 'Update' : 'Save'"
                :class="['save-btn', editingSale ? 'update-btn' : 'create-btn']"
                :loading="loading"
              />
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
const startTime = ref('')
const endTime = ref('')

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
  { name: 'paymentStatus', label: 'Payment Status', field: 'paymentStatus', align: 'center' },
  { name: 'date', label: 'Date / Time', field: row => row.dateTime || row.date || 'N/A', align: 'left' },
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

function buildFilterDateTime(dateStr, timeStr, isEnd = false) {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return null

  let hours = isEnd ? 23 : 0
  let minutes = isEnd ? 59 : 0
  let seconds = isEnd ? 59 : 0
  let milliseconds = isEnd ? 999 : 0

  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    if (Number.isFinite(h) && Number.isFinite(m)) {
      hours = h
      minutes = m
      seconds = isEnd ? 59 : 0
      milliseconds = isEnd ? 999 : 0
    }
  }

  return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds)
}

function formatSaleDateTime(date) {
  if (!date) return 'N/A'
  return date.toLocaleString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

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

  const startBoundary = buildFilterDateTime(startDate.value, startTime.value)
  if (startBoundary) {
    const startTs = startBoundary.getTime()
    result = result.filter(sale => Number(sale.createdAtTs || 0) >= startTs)
  }

  const endBoundary = buildFilterDateTime(endDate.value, endTime.value, true)
  if (endBoundary) {
    const endTs = endBoundary.getTime()
    result = result.filter(sale => Number(sale.createdAtTs || 0) <= endTs)
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

    const start = buildFilterDateTime(startDate.value, startTime.value)
    if (start) {
      constraints.push(where('createdAt', '>=', start))
    }

    const end = buildFilterDateTime(endDate.value, endTime.value, true)
    if (end) {
      constraints.push(where('createdAt', '<=', end))
    }

    const q = query(collection(db, 'sales'), ...constraints)

    const snapshot = await getDocs(q)
    sales.value = snapshot.docs.map(doc => {
      const createdAtDate = doc.data().createdAt?.toDate()
      return {
        id: doc.id,
        ...doc.data(),
        date: createdAtDate?.toLocaleDateString('en-CA') || 'N/A',
        dateTime: formatSaleDateTime(createdAtDate),
        createdAtTs: createdAtDate?.getTime() || 0
      }
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load sales: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

watch([startDate, endDate, startTime, endTime], () => {
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
  invoiceNo: '00',
  customerName: '',
  customerPhone: '',
  services: [],
  amount: 0,
  weight: 0,
  status: 'Pending',
  paymentStatus: 'Unpaid',
  paymentType: 'Cash',
  enterAmount: 0,
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

const overallTotal = computed(() => {
  const servicesTotal = saleForm.value.services.length
    ? saleForm.value.services.reduce((sum, service) => sum + Number(service.price || 0), 0)
    : Number(saleForm.value.amount || 0)
  const itemsTotal = saleItems.value.reduce((sum, item) => sum + Number(item.price || 0), 0)
  return Number((servicesTotal + itemsTotal).toFixed(2))
})

const changeAmount = computed(() =>
  Number((Number(saleForm.value.enterAmount || 0) - overallTotal.value).toFixed(2))
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
  const userBranchId = userStore.userData?.branchId || ''
  saleForm.value = {
    branchId: userStore.isAdmin ? sale.branchId : userBranchId,
    invoiceNo: sale.invoiceNo || '00',
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    services,
    amount: sale.amount,
    weight: sale.weight,
    status: sale.status,
    paymentStatus: sale.paymentStatus,
    paymentType: sale.paymentType,
    enterAmount: sale.enterAmount || 0,
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
    const currentUserId = userStore.user?.uid || ''
    const currentUserName = userStore.userData?.displayName || userStore.userData?.email || 'User'

    const saleDocRef = isEditing
      ? doc(db, 'sales', editingSale.value.id)
      : doc(collection(db, 'sales'))

    const { services, ...formData } = saleForm.value
    const serviceRecords = services
      .map(s => ({ name: getServiceName(s.name), price: Number(s.price || 0) }))
      .filter(s => s.name)
    const serviceTotal = serviceRecords.reduce((sum, s) => sum + Number(s.price || 0), 0)
    const isCashPayment = formData.paymentType === 'Cash'
    if (!isCashPayment) delete formData.enterAmount
    const cashFields = isCashPayment
      ? { enterAmount: Number(formData.enterAmount || 0), change: changeAmount.value }
      : { enterAmount: null, change: null }

    if (isEditing) {
      writePromise = updateDoc(saleDocRef, {
        ...formData,
        ...cashFields,
        userId: currentUserId,
        userName: currentUserName,
        service: serviceRecords,
        amount: serviceTotal,
        items: saleItems.value,
        total: overallTotal.value,
        updatedAt: new Date()
      })
    } else {
      writePromise = setDoc(saleDocRef, {
        ...formData,
        ...cashFields,
        userId: currentUserId,
        userName: currentUserName,
        service: serviceRecords,
        amount: serviceTotal,
        items: saleItems.value,
        total: overallTotal.value,
        createdBy: currentUserId,
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

    const saleToPrint = {
      id: saleDocRef.id,
      branchId: saleForm.value.branchId,
      invoiceNo: saleForm.value.invoiceNo,
      customerName: saleForm.value.customerName,
      service: serviceRecords,
      amount: serviceTotal,
      items: saleItems.value.map(item => ({ ...item })),
      total: overallTotal.value,
      status: saleForm.value.status,
      date: editingSale.value?.dateTime || editingSale.value?.date || formatSaleDateTime(new Date())
    }

    const existingSale = sales.value.find(s => s.id === saleDocRef.id)
    const createdAtDate = existingSale?.createdAtTs
      ? new Date(existingSale.createdAtTs)
      : new Date()
    const updatedSaleRecord = {
      ...(existingSale || {}),
      ...formData,
      id: saleDocRef.id,
      userId: currentUserId,
      userName: currentUserName,
      service: serviceRecords,
      amount: serviceTotal,
      items: saleItems.value.map(item => ({ ...item })),
      total: overallTotal.value,
      date: createdAtDate.toLocaleDateString('en-CA'),
      dateTime: formatSaleDateTime(createdAtDate),
      createdAtTs: createdAtDate.getTime(),
      updatedAt: new Date()
    }

    if (isEditing) {
      sales.value = sales.value.map(sale =>
        sale.id === saleDocRef.id ? updatedSaleRecord : sale
      )
    } else {
      sales.value = [updatedSaleRecord, ...sales.value]
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

    printSale(saleToPrint)

    showAddDialog.value = false
    editingSale.value = null
    resetForm()

    if (result === 'synced') {
      await loadSales()
    }
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
  const userBranchId = userStore.userData?.branchId || ''
  saleForm.value = {
    branchId: userStore.isAdmin ? '' : userBranchId,
    invoiceNo: '00',
    customerName: '',
    customerPhone: '',
    services: [],
    amount: 0,
    weight: 0,
    status: 'Pending',
    paymentStatus: 'Unpaid',
    paymentType: 'Cash',
    enterAmount: 0,
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

  const services = Array.isArray(sale.service) ? sale.service : (sale.service ? [sale.service] : [])
  const serviceRows = services
    .map(s => `<div class="row"><span>${getServiceName(s)}</span><span>${formatCurrency(Number(s.price || 0))}</span></div>`)
    .join('')
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
          @page {
            size: 58mm 210mm;
            margin: 0;
          }
          html, body {
            width: 48mm;
            max-width: 48mm;
            height: 180mm;
            max-height: 180mm;
            margin: 0;
            padding: 1mm 1mm 0;
            background: #fff;
            color: #000;
            font-family: 'Segoe UI', sans-serif;
            font-size: 10px;
            line-height: 1.2;
            box-sizing: border-box;
            overflow: hidden;
          }
          body {
            padding: 1.2mm 1.2mm 0;
          }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .line { border-top: 1px dashed #000; margin: 1.2mm 0; }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.8mm;
            gap: 0.8mm;
          }
          .row span:first-child {
            flex: 1 1 auto;
            min-width: 0;
          }
          .row span:last-child {
            flex: 0 0 auto;
            text-align: right;
            white-space: nowrap;
          }
          .spacer { height: 1.5mm; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div class="center">
          <img src="${window.location.origin}/logoPrint.png" alt="Logo" style="width: 14mm; height: auto; margin-bottom: 1.5mm;" />
          <div class="bold" style="font-size: 16px;">${branch.name || 'Yoonek Laundry'}</div>
          ${addressLine}
          ${phoneLine}
        </div>
        <div class="spacer"></div>
        <div class="line"></div>
        <div class="row"><span>Date:</span><span>${sale.date}</span></div>
        <div class="row"><span>Invoice No.:</span><span>${sale.invoiceNo}</span></div>
        <div class="row"><span>Customer:</span><span>${sale.customerName}</span></div>
        <div class="row bold"><span>Services:</span><span></span></div>
        ${serviceRows}
        <div class="line"></div>
        <div class="row"><span>Service Amount:</span><span>${formatCurrency(sale.amount)}</span></div>
        ${itemsSection}
        <div class="line"></div>
        <div class="row bold"><span>Total:</span><span>${formatCurrency(Number(sale.total !== undefined ? sale.total : (Number(sale.amount || 0) + itemsTotal)))}</span></div>
        <div class="line"></div>
        <div class="row"><span>Status:</span><span>${sale.status}</span></div>
        <div class="center">Thank you!</div>
      </body>
    </html>
  `

  const thermalPage = { width: 58000, height: 180000 }

  if (window.electronPrint && typeof window.electronPrint.printReceipt === 'function') {
    window.electronPrint.printReceipt({ html: printContent, pageSize: thermalPage })
    return
  }

  const printWindow = window.open('', '_blank', `left=0,top=0,width=${screen.availWidth},height=${screen.availHeight}`)
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.moveTo(0, 0)
    printWindow.resizeTo(screen.availWidth, screen.availHeight)
    printWindow.focus()
    printWindow.print()
  }
}

function printReport() {
  const branch = branchOptions.value.find(b => b.value === selectedBranch.value)?.label || 'All Branches'
  const periodStart = startDate.value
    ? `${startDate.value} ${startTime.value || '00:00'}`
    : 'All'
  const periodEnd = endDate.value
    ? `${endDate.value} ${endTime.value || '23:59'}`
    : 'All'

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const serviceGroups = {}
  let serviceTotal = 0

  filteredSales.value.forEach(sale => {
    const services = Array.isArray(sale.service) ? sale.service : (sale.service ? [sale.service] : [])
    services.forEach((service, index) => {
      const name = getServiceName(service) || 'Unknown Service'
      let price = 0
      if (service && typeof service === 'object') {
        price = Number(service.price || 0)
      } else if (typeof service === 'string' && services.length === 1 && index === 0) {
        price = Number(sale.amount || 0)
      }
      serviceTotal += price
      if (!serviceGroups[name]) {
        serviceGroups[name] = { name, count: 0, total: 0 }
      }
      serviceGroups[name].count += 1
      serviceGroups[name].total += price
    })
  })
  const serviceLines = Object.values(serviceGroups)
    .map(group => `<div class="row"><span>${escapeHtml(group.name)} x ${group.count}</span><span>${formatCurrency(group.total)}</span></div>`)

  const itemGroups = {}
  let itemTotal = 0

  filteredSales.value.forEach(sale => {
    const items = Array.isArray(sale.items) ? sale.items : []
    items.forEach(item => {
      const name = item?.name || 'Unknown Item'
      const price = Number(item?.price || 0)
      itemTotal += price
      if (!itemGroups[name]) {
        itemGroups[name] = { name, count: 0, total: 0 }
      }
      itemGroups[name].count += 1
      itemGroups[name].total += price
    })
  })
  const itemLines = Object.values(itemGroups)
    .map(group => `<div class="row"><span>${escapeHtml(group.name)} x ${group.count}</span><span>${formatCurrency(group.total)}</span></div>`)

  const paymentTypes = ['Gcash', 'Cash', 'Bank Transfer']
  const paymentBuckets = {
    Gcash: [],
    Cash: [],
    'Bank Transfer': []
  }

  filteredSales.value.forEach(sale => {
    const paymentType = paymentTypes.find(type => type.toLowerCase() === String(sale.paymentType || '').toLowerCase())
    if (!paymentType) return
    const total = Number(sale.total ?? sale.amount ?? 0)
    paymentBuckets[paymentType].push({
      label: sale.invoiceNo || sale.customerName || sale.id,
      amount: total
    })
  })

  const paymentsHtml = paymentTypes.map(type => {
    const list = paymentBuckets[type]
    const listHtml = list.length
      ? list.map(entry => `<div class="row"><span>${escapeHtml(entry.label)}</span><span>${formatCurrency(entry.amount)}</span></div>`).join('')
      : '<div class="muted">No records</div>'
    const total = list.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    return `
      <div class="subsection-title">${type} listing</div>
      ${listHtml}
      <div class="row total-row"><span>Total:</span><span>${formatCurrency(total)}</span></div>
    `
  }).join('')

  const serviceHtml = serviceLines.length ? serviceLines.join('') : '<div class="muted">No records</div>'
  const itemHtml = itemLines.length ? itemLines.join('') : '<div class="muted">No records</div>'

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sales Report</title>
      <style>
        @page {
          size: 58mm 210mm;
          margin: 0;
        }
        html, body {
          width: 48mm;
          max-width: 48mm;
          height: 180mm;
          max-height: 180mm;
          margin: 0;
          padding: 1.2mm 1.2mm 0;
          color: #000;
          font-family: 'Segoe UI', sans-serif;
          font-size: 7.2px;
          box-sizing: border-box;
          overflow: hidden;
        }
        body {
          padding: 1.2mm 1.2mm 0;
        }
        h2 {
          margin: 0 0 8px;
          color: #000;
          font-size: 12px;
        }
        .meta { margin-bottom: 8px; font-size: 7.2px; color: #000; }
        .section-title {
          margin-top: 8px;
          margin-bottom: 4px;
          font-size: 8px;
          font-weight: 700;
          border-top: 1px dashed #000;
          padding-top: 4px;
        }
        .subsection-title {
          margin-top: 4px;
          margin-bottom: 2px;
          font-size: 7.4px;
          font-weight: 700;
        }
        .row {
          display: flex;
          justify-content: space-between;
          gap: 4px;
          margin-bottom: 1px;
        }
        .row span:first-child {
          flex: 1 1 auto;
          min-width: 0;
        }
        .row span:last-child {
          flex: 0 0 auto;
          white-space: nowrap;
          text-align: right;
        }
        .total-row {
          border-top: 1px solid #000;
          margin-top: 2px;
          padding-top: 2px;
          font-weight: 700;
        }
        .muted {
          opacity: 0.7;
          margin-bottom: 2px;
        }
      </style>
    </head>
    <body onload="window.print(); window.onafterprint = () => window.close()">
      <h2>Sales Report</h2>
      <div class="meta">
        Branch: ${branch}<br>
        Period: ${periodStart} to ${periodEnd}
      </div>

      <div class="section-title">Service Types:</div>
      ${serviceHtml}
      <div class="row total-row"><span>Total:</span><span>${formatCurrency(serviceTotal)}</span></div>

      <div class="section-title">Items:</div>
      ${itemHtml}
      <div class="row total-row"><span>Total:</span><span>${formatCurrency(itemTotal)}</span></div>

      <div class="section-title">Payments:</div>
      ${paymentsHtml}
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
    startTime.value = '00:00'
    endTime.value = '23:59'
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

.payment-badge {
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 700;
  border: 1px solid transparent;
}

.payment-badge--paid {
  background: rgba(76, 175, 80, 0.16);
  color: #1B5E20;
  border-color: rgba(76, 175, 80, 0.35);
}

.payment-badge--unpaid {
  background: rgba(233, 30, 140, 0.12);
  color: #AD1457;
  border-color: rgba(233, 30, 140, 0.35);
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

/* ===== Cash payment panel ===== */
.cash-panel {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(233, 30, 140, 0.15);
  border-radius: 18px;
  padding: 14px;
}

.cash-panel__input {
  margin-bottom: 12px;
}

.cash-panel__change {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: 14px;
  font-weight: 700;
}

.cash-panel__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.cash-panel__value {
  font-size: 1.15rem;
}

.cash-panel__change--positive {
  background: rgba(76, 175, 80, 0.14);
  color: #1B5E20;
}

.cash-panel__change--negative {
  background: rgba(233, 30, 140, 0.12);
  color: #AD1457;
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
  padding: 0 20px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.35);
  transition: transform 0.25s ease;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(233, 30, 140, 0.45);
}

.create-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
}

.update-btn {
  background: linear-gradient(135deg, #1976D2 0%, #42A5F5 100%);
  box-shadow: 0 10px 28px rgba(25, 118, 210, 0.35);
}

.update-btn:hover {
  box-shadow: 0 14px 36px rgba(25, 118, 210, 0.45);
}
</style>
