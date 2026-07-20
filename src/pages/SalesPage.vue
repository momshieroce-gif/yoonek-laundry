<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h4 text-weight-bold">Sales</div>
      <div class="row q-gutter-sm">
        <q-btn
          label="Add Sale"
          color="primary"
          icon="add"
          @click="showAddDialog = true"
        />
        <q-btn
          label="Print Report"
          color="secondary"
          icon="print"
          @click="printReport"
        />
      </div>
    </div>

    <!-- Filters -->
    <q-card class="q-pa-md q-mb-md">
      <div class="row q-gutter-md">
        <div class="col-12 col-sm-3">
          <q-input
            v-model="searchText"
            label="Search"
            outlined
            dense
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="search" />
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
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input
            v-model="startDate"
            label="Start Date"
            type="date"
            outlined
            dense
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input
            v-model="endDate"
            label="End Date"
            type="date"
            outlined
            dense
          />
        </div>
      </div>
    </q-card>

    <q-card class="data-table">
      <q-table
        :rows="filteredSales"
        :columns="salesColumns"
        row-key="id"
        flat
        bordered
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-amount="props">
          <q-td :props="props">
            ${{ props.row.amount.toFixed(2) }}
          </q-td>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="getStatusColor(props.row.status)">
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
              icon="edit"
              color="primary"
              @click="editSale(props.row)"
            />
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="negative"
              @click="deleteSale(props.row.id)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showAddDialog">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ editingSale ? 'Edit Sale' : 'Add New Sale' }}</div>
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
              :rules="[val => !!val || 'Branch is required']"
            />
            <q-input
              v-model="saleForm.customerName"
              label="Customer Name"
              outlined
              dense
              :rules="[val => !!val || 'Customer name is required']"
            />
            <q-input
              v-model="saleForm.customerPhone"
              label="Customer Phone"
              outlined
              dense
            />
            <q-select
              v-model="saleForm.service"
              label="Service Type"
              :options="serviceOptions"
              outlined
              dense
              :rules="[val => !!val || 'Service type is required']"
            />
            <q-input
              v-model.number="saleForm.amount"
              label="Amount"
              type="number"
              outlined
              dense
              :rules="[val => val > 0 || 'Amount must be greater than 0']"
            />
            <q-input
              v-model="saleForm.weight"
              label="Weight (kg)"
              type="number"
              outlined
              dense
            />
            <q-select
              v-model="saleForm.status"
              label="Status"
              :options="statusOptions"
              outlined
              dense
            />
            <q-input
              v-model="saleForm.notes"
              label="Notes"
              type="textarea"
              outlined
              dense
              rows="3"
            />
            <div class="row justify-end q-mt-md">
              <q-btn flat label="Cancel" v-close-popup class="q-mr-sm" />
              <q-btn type="submit" label="Save" color="primary" :loading="loading" />
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
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
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

function printReport() {
  window.print()
}

onMounted(() => {
  loadBranches()
  loadSales()
})
</script>
