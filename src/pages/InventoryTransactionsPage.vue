<template>
  <q-page class="transaction-page q-pa-md">
    <!-- Header -->
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Inventory Transactions</div>
        <div class="page-subtitle">Track stock movements and adjustments</div>
      </div>
      <q-btn
        label="Add Transaction"
        icon="add"
        rounded
        unelevated
        class="add-btn"
        @click="showAddDialog = true"
      />
    </div>

    <!-- Filters -->
    <q-card class="filter-card q-pa-md q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-4">
          <q-input
            v-model="searchText"
            label="Search item / notes"
            outlined
            dense
            clearable
            class="transaction-input"
          >
            <template v-slot:prepend>
              <q-icon name="search" color="pink-5" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
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
            class="transaction-input"
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-select
            v-model="selectedType"
            label="Transaction Type"
            :options="transactionTypeOptions"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="transaction-input"
          />
        </div>
      </div>
    </q-card>

    <!-- Transactions table -->
    <q-card class="glass-card data-table">
      <q-table
        :rows="filteredTransactions"
        :columns="transactionColumns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-date="props">
          <q-td :props="props">
            {{ formatDate(props.row.date) }}
          </q-td>
        </template>
        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <q-badge rounded class="status-badge" :color="getTypeColor(props.row.transactionType)">
              {{ props.row.transactionType }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-quantity="props">
          <q-td :props="props" class="text-weight-bold">
            {{ props.row.quantity }}
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              v-if="!props.row.saleId"
              flat
              round
              dense
              icon="delete"
              class="action-delete"
              @click="deleteTransaction(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showAddDialog" class="transaction-dialog">
      <q-card class="dialog-card">
        <q-card-section>
          <div class="dialog-title">Add Transaction</div>
          <div class="dialog-subtitle">Enter the transaction details below</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleSaveTransaction" class="q-gutter-md">
            <q-select
              v-model="transactionForm.branchId"
              label="Branch"
              :options="branchOptions"
              outlined
              dense
              emit-value
              map-options
              class="transaction-input"
              :rules="[val => !!val || 'Branch is required']"
            />
            <q-input
              v-model="transactionForm.date"
              label="Date"
              type="date"
              outlined
              dense
              class="transaction-input"
              :rules="[val => !!val || 'Date is required']"
            >
              <template v-slot:prepend>
                <q-icon name="event" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="transactionForm.inventoryItemName"
              label="Inventory Item"
              outlined
              dense
              class="transaction-input"
              :rules="[val => !!val || 'Inventory item is required']"
            />
            <q-select
              v-model="transactionForm.transactionType"
              label="Transaction Type"
              :options="transactionTypeOptions"
              outlined
              dense
              emit-value
              map-options
              class="transaction-input"
              :rules="[val => !!val || 'Transaction type is required']"
            />
            <q-input
              v-model.number="transactionForm.quantity"
              label="Quantity"
              type="number"
              outlined
              dense
              class="transaction-input"
              :rules="quantityRules"
            >
              <template v-slot:prepend>
                <q-icon name="scale" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="transactionForm.notes"
              label="Notes"
              type="textarea"
              outlined
              dense
              rows="3"
              class="transaction-input"
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
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from '../boot/firebase'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  if (!userStore.isAuthenticated) {
    router.push('/login')
  }
})

const loading = ref(false)
const transactions = ref([])
const inventory = ref([])
const branches = ref([])
const showAddDialog = ref(false)
const searchText = ref('')
const selectedBranch = ref('')
const selectedType = ref('')

const transactionTypeOptions = [
  { label: 'Stock In', value: 'Stock In' },
  { label: 'Stock Out', value: 'Stock Out' },
  { label: 'Adjustment', value: 'Adjustment' }
]

const transactionColumns = [
  { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
  { name: 'inventoryItemName', label: 'Item', field: 'inventoryItemName', align: 'left' },
  { name: 'transactionType', label: 'Type', field: 'transactionType', align: 'center' },
  { name: 'quantity', label: 'Quantity', field: 'quantity', align: 'center' },
  { name: 'branchName', label: 'Branch', field: 'branchName', align: 'left' },
  { name: 'notes', label: 'Notes', field: 'notes', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const branchOptions = computed(() =>
  branches.value.map(branch => ({ label: branch.name, value: branch.id }))
)

const inventoryOptions = computed(() => {
  const branchId = transactionForm.value.branchId
  return inventory.value
    .filter(item => !branchId || item.branchId === branchId)
    .map(item => ({ label: `${item.name} - Qty: ${item.currentStock}`, value: item.id }))
})

const quantityRules = computed(() => {
  return [val => {
    if (transactionForm.value.transactionType === 'Adjustment') {
      return (val !== '' && val !== null) || 'Quantity is required'
    }
    return val > 0 || 'Quantity must be greater than 0'
  }]
})

const branchMap = computed(() => {
  const map = {}
  branches.value.forEach(branch => { map[branch.id] = branch.name })
  return map
})

const inventoryMap = computed(() => {
  const map = {}
  inventory.value.forEach(item => { map[item.id] = item.name })
  return map
})

const filteredTransactions = computed(() => {
  let result = transactions.value

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(item =>
      (item.inventoryItemName || '').toLowerCase().includes(search) ||
      (item.notes || '').toLowerCase().includes(search)
    )
  }

  if (selectedBranch.value) {
    result = result.filter(item => item.branchId === selectedBranch.value)
  }

  if (selectedType.value) {
    result = result.filter(item => item.transactionType === selectedType.value)
  }

  return result
})

const transactionForm = ref({
  branchId: '',
  inventoryItemName: '',
  transactionType: 'Stock In',
  quantity: 1,
  date: new Date().toISOString().split('T')[0],
  notes: ''
})

function getTypeColor(type) {
  if (type === 'Stock In') return 'positive'
  if (type === 'Stock Out') return 'negative'
  return 'warning'
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return isNaN(date) ? dateString : date.toLocaleDateString()
}

async function loadBranches() {
  try {
    const snapshot = await getDocs(collection(db, 'branches'))
    branches.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading branches:', error)
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

async function loadTransactions() {
  loading.value = true
  try {
    const snapshot = await getDocs(collection(db, 'inventory_transactions'))
    const docs = snapshot.docs.map(docItem => {
      const data = docItem.data()
      return {
        id: docItem.id,
        ...data,
        inventoryItemName: data.inventoryItemName || inventoryMap.value[data.inventoryItemId] || 'Unknown Item',
        branchName: branchMap.value[data.branchId] || 'Unknown Branch'
      }
    })
    transactions.value = docs.sort((a, b) => new Date(b.date) - new Date(a.date))
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load transactions: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

async function handleSaveTransaction() {
  loading.value = true
  try {
    const item = inventory.value.find(inv =>
      inv.name === transactionForm.value.inventoryItemName &&
      inv.branchId === transactionForm.value.branchId
    )
    const branch = branches.value.find(b => b.id === transactionForm.value.branchId)
    const payload = {
      ...transactionForm.value,
      inventoryItemId: item ? item.id : '',
      inventoryItemName: transactionForm.value.inventoryItemName,
      branchName: branch ? branch.name : 'Unknown Branch',
      updatedAt: new Date()
    }

    await addDoc(collection(db, 'inventory_transactions'), {
      ...payload,
      createdBy: userStore.user.uid,
      createdAt: new Date()
    })
    $q.notify({
      type: 'positive',
      message: 'Transaction added successfully!'
    })

    if (item) {
      const qty = Number(transactionForm.value.quantity) || 0
      const currentStock = Number(item.currentStock) || 0
      let newStock = currentStock
      if (transactionForm.value.transactionType === 'Stock In') {
        newStock = currentStock + qty
      } else if (transactionForm.value.transactionType === 'Stock Out') {
        newStock = Math.max(0, currentStock - qty)
      } else if (transactionForm.value.transactionType === 'Adjustment') {
        newStock = currentStock + qty
      }
      await updateDoc(doc(db, 'inventory', item.id), {
        currentStock: newStock,
        updatedAt: new Date()
      })
      await loadInventory()
    }

    showAddDialog.value = false
    resetForm()
    await loadTransactions()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save transaction: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function deleteTransaction(transaction) {
  $q.dialog({
    title: 'Delete Transaction',
    message: 'Are you sure you want to delete this transaction?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const item = inventory.value.find(inv =>
        (transaction.inventoryItemId && inv.id === transaction.inventoryItemId) ||
        (inv.name === transaction.inventoryItemName && inv.branchId === transaction.branchId)
      )
      if (item) {
        const current = Number(item.currentStock) || 0
        const qty = Number(transaction.quantity) || 0
        let newStock = current
        if (transaction.transactionType === 'Stock Out') {
          newStock = current + qty
        } else if (transaction.transactionType === 'Stock In' || transaction.transactionType === 'Adjustment') {
          newStock = Math.max(0, current - qty)
        }
        await updateDoc(doc(db, 'inventory', item.id), {
          currentStock: newStock,
          updatedAt: new Date()
        })
      }

      await deleteDoc(doc(db, 'inventory_transactions', transaction.id))
      $q.notify({
        type: 'positive',
        message: 'Transaction deleted successfully!'
      })
      await loadInventory()
      await loadTransactions()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Failed to delete transaction: ' + error.message
      })
    }
  })
}

function resetForm() {
  transactionForm.value = {
    branchId: '',
    inventoryItemName: '',
    transactionType: 'Stock In',
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  }
}

onMounted(async () => {
  selectedBranch.value = userStore.userData?.branchId || ''
  await loadBranches()
  await loadInventory()
  await loadTransactions()
})
</script>

<style scoped>
.transaction-page {
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

.filter-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(233, 30, 140, 0.12);
  border-radius: 22px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.1);
  backdrop-filter: blur(8px);
}

.transaction-input :deep(.q-field__control) {
  border-radius: 14px;
}

.transaction-input :deep(.q-field__control::before) {
  border-color: rgba(233, 30, 140, 0.35);
}

.transaction-input :deep(.q-field--focused .q-field__control::after) {
  border-color: #E91E8C;
}

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

.transaction-dialog :deep(.q-dialog__backdrop) {
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
