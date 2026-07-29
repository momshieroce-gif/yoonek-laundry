<template>
  <q-page class="inventory-page q-pa-md">
    <!-- Header -->
    <div class="page-header q-mb-lg row items-center justify-between">
      <div>
        <div class="page-title">Inventory</div>
        <div class="page-subtitle">Manage stock levels and supplies</div>
      </div>
      <q-btn rounded unelevated icon="add" label="Create Inventory" class="save-btn" @click="openAddDialog" />
    </div>

    <!-- Filters -->
    <q-card class="filter-card q-pa-md q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-4">
          <q-input
            v-model="searchText"
            label="Search items"
            outlined
            dense
            clearable
            class="inventory-input"
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
            class="inventory-input"
          />
        </div>
      </div>
    </q-card>

    <!-- Inventory table -->
    <q-card class="glass-card data-table">
      <q-table
        :rows="filteredInventory"
        :columns="inventoryColumns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-currentStock="props">
          <q-td :props="props">
            <q-badge
              rounded
              class="quantity-badge"
              :class="props.row.currentStock <= props.row.minStock ? 'badge-negative' : 'badge-positive'"
            >
              {{ props.row.currentStock }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge rounded class="status-badge" :color="getStockStatusColor(props.row)">
              {{ getStockStatus(props.row) }}
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
              class="action-edit"
              @click="viewItem(props.row)"
            />
            <q-btn
              flat
              round
              dense
              icon="delete"
              class="action-delete"
              @click="deleteItem(props.row.id)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showAddDialog" class="inventory-dialog">
      <q-card class="dialog-card">
        <q-card-section>
          <div class="dialog-title">{{ isAddMode ? 'Create Inventory' : 'View Item' }}</div>
          <div class="dialog-subtitle">{{ isAddMode ? 'Enter the item details below' : 'Item details' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form class="q-gutter-md" @submit="isAddMode ? handleSaveInventory() : handleUpdatePrice()">
            <q-select
              v-model="itemForm.branchId"
              label="Branch"
              :options="branchOptions"
              outlined
              dense
              emit-value
              map-options
              class="inventory-input"
              :disable="!isAddMode"
              :rules="isAddMode ? [val => !!val || 'Branch is required'] : []"
            />
            <q-input
              v-model="itemForm.name"
              label="Item Name"
              outlined
              dense
              class="inventory-input"
              :disable="!isAddMode"
              :rules="isAddMode ? [val => !!val || 'Item name is required'] : []"
            >
              <template v-slot:prepend>
                <q-icon name="label" color="pink-5" />
              </template>
            </q-input>
            <div class="row q-col-gutter-md q-mt-sm">
              <div class="col-6">
                <q-input
                  v-model.number="itemForm.currentStock"
                  label="Current Stock"
                  type="number"
                  outlined
                  dense
                  class="inventory-input"
                  style="margin-left: 15px"
                  :disable="!isAddMode"
                  :rules="isAddMode ? [val => val !== '' && val !== null || 'Required'] : []"
                >
                  <template v-slot:prepend>
                    <q-icon name="inventory_2" color="pink-5" />
                  </template>
                </q-input>
              </div>
              <div class="col-6">
                <q-input
                  v-model.number="itemForm.minStock"
                  label="Minimum Stock"
                  type="number"
                  outlined
                  dense
                  class="inventory-input"
                  :disable="!isAddMode"
                  :rules="isAddMode ? [val => val !== '' && val !== null || 'Required'] : []"
                >
                  <template v-slot:prepend>
                    <q-icon name="warning" color="pink-5" />
                  </template>
                </q-input>
              </div>
            </div>
            <q-input
              v-model.number="itemForm.unitPrice"
              label="Unit Price"
              type="number"
              outlined
              dense
              step="0.01"
              class="inventory-input"
            >
              <template v-slot:prepend>
                <q-icon name="fa-solid fa-peso-sign" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="itemForm.notes"
              label="Notes"
              type="textarea"
              outlined
              dense
              rows="3"
              class="inventory-input"
            />
            <div class="row justify-end q-mt-md">
              <template v-if="isAddMode">
                <q-btn flat rounded label="Cancel" v-close-popup class="cancel-btn q-mr-sm" />
                <q-btn type="submit" rounded unelevated label="Save" class="save-btn" :loading="loading" />
              </template>
              <template v-else>
                <q-btn flat rounded label="Close" v-close-popup class="cancel-btn q-mr-sm" />
                <q-btn type="submit" rounded unelevated label="Update" class="save-btn" :loading="loading" />
              </template>
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
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from '../boot/firebase'
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
const inventory = ref([])
const branches = ref([])
const transactions = ref([])
const showAddDialog = ref(false)
const isAddMode = ref(false)
const selectedInventoryId = ref('')
const searchText = ref('')
const selectedBranch = ref('')

const inventoryColumns = [
  { name: 'name', label: 'Item Name', field: 'name', align: 'left', sortable: true },
  { name: 'currentStock', label: 'Current Stock', field: 'currentStock', align: 'center' },
  { name: 'minStock', label: 'Min Stock', field: 'minStock', align: 'center' },
  { name: 'unitPrice', label: 'Unit Price', field: 'unitPrice', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]


const branchOptions = computed(() => {
  return branches.value.map(branch => ({
    label: branch.name,
    value: branch.id
  }))
})

const itemNameOptions = computed(() => {
  const names = [...new Set(transactions.value.map(t => t.inventoryItemName))]
  return names.map(name => ({ label: name, value: name }))
})

const filteredInventory = computed(() => {
  let result = inventory.value

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(item =>
      item.name.toLowerCase().includes(search)
    )
  }

  if (selectedBranch.value) {
    result = result.filter(item => item.branchId === selectedBranch.value)
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

async function loadInventoryTransactions() {
  try {
    const snapshot = await getDocs(collection(db, 'inventory_transactions'))
    transactions.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading inventory transactions:', error)
  }
}

async function loadInventory() {
  loading.value = true
  try {
    const snapshot = await getDocs(collection(db, 'inventory'))
    inventory.value = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }))
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load inventory: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function getStockStatus(item) {
  if (item.currentStock <= 0) return 'Out of Stock'
  if (item.currentStock <= item.minStock) return 'Low Stock'
  return 'In Stock'
}

function getStockStatusColor(item) {
  if (item.currentStock <= 0) return 'negative'
  if (item.currentStock <= item.minStock) return 'warning'
  return 'positive'
}

const itemForm = ref({
  branchId: '',
  name: '',
  currentStock: 0,
  minStock: 10,
  unitPrice: 0,
  notes: ''
})

function viewItem(item) {
  isAddMode.value = false
  selectedInventoryId.value = item.id
  itemForm.value = {
    branchId: item.branchId,
    name: item.name,
    currentStock: item.currentStock,
    minStock: item.minStock,
    unitPrice: item.unitPrice,
    notes: item.notes
  }
  showAddDialog.value = true
}

function openAddDialog() {
  isAddMode.value = true
  selectedInventoryId.value = ''
  itemForm.value = {
    branchId: userStore.userData?.branchId || '',
    name: '',
    currentStock: 0,
    minStock: 10,
    unitPrice: 0,
    notes: ''
  }
  showAddDialog.value = true
}

function resetItemForm() {
  itemForm.value = {
    branchId: userStore.userData?.branchId || '',
    name: '',
    currentStock: 0,
    minStock: 10,
    unitPrice: 0,
    notes: ''
  }
}

async function handleSaveInventory() {
  loading.value = true
  try {
    const docRef = await addDoc(collection(db, 'inventory'), {
      ...itemForm.value,
      createdBy: userStore.user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    const branch = branches.value.find(b => b.id === itemForm.value.branchId)
    await addDoc(collection(db, 'inventory_transactions'), {
      branchId: itemForm.value.branchId,
      branchName: branch ? branch.name : 'Unknown Branch',
      inventoryItemId: docRef.id,
      inventoryItemName: itemForm.value.name,
      transactionType: 'Stock In',
      quantity: itemForm.value.currentStock,
      date: new Date().toISOString().split('T')[0],
      notes: 'Initial stock',
      createdBy: userStore.user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    $q.notify({
      type: 'positive',
      message: 'Inventory item created successfully!'
    })
    showAddDialog.value = false
    resetItemForm()
    await loadInventory()
    await loadInventoryTransactions()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to create inventory item: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

async function handleUpdatePrice() {
  if (!selectedInventoryId.value) return
  loading.value = true
  try {
    await updateDoc(doc(db, 'inventory', selectedInventoryId.value), {
      unitPrice: itemForm.value.unitPrice,
      notes: itemForm.value.notes,
      updatedAt: new Date()
    })
    $q.notify({
      type: 'positive',
      message: 'Item updated successfully!'
    })
    showAddDialog.value = false
    await loadInventory()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to update item: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function deleteItem(id) {
  $q.dialog({
    title: 'Delete Inventory Item',
    message: 'Are you sure you want to delete this inventory item and its related transactions?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const inventoryQuery = query(collection(db, 'inventory_transactions'), where('inventoryItemId', '==', id))
      const snapshot = await getDocs(inventoryQuery)
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'inventory_transactions', d.id)))
      await Promise.all(deletePromises)
      await deleteDoc(doc(db, 'inventory', id))
      $q.notify({
        type: 'positive',
        message: 'Inventory item deleted successfully!'
      })
      await loadInventory()
      await loadInventoryTransactions()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Failed to delete inventory item: ' + error.message
      })
    }
  })
}

onMounted(async () => {
  selectedBranch.value = userStore.userData?.branchId || ''
  await loadBranches()
  await loadInventoryTransactions()
  loadInventory()
})
</script>

<style scoped>
/* ===== Pink inventory page ===== */
.inventory-page {
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

/* ===== Filter card ===== */
.filter-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(233, 30, 140, 0.12);
  border-radius: 22px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.1);
  backdrop-filter: blur(8px);
}

.inventory-input :deep(.q-field__control) {
  border-radius: 14px;
}

.inventory-input :deep(.q-field__control::before) {
  border-color: rgba(233, 30, 140, 0.35);
}

.inventory-input :deep(.q-field--focused .q-field__control::after) {
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

.quantity-badge {
  padding: 4px 10px;
  font-size: 0.85rem;
  font-weight: 700;
}

.badge-positive {
  background: #E91E8C;
  color: white;
}

.badge-negative {
  background: #C2185B;
  color: white;
}

.status-badge {
  padding: 4px 10px;
  font-size: 0.8rem;
}

.action-add,
.action-remove,
.action-edit,
.action-delete {
  transition: transform 0.2s ease;
}

.action-add {
  color: #E91E8C;
}

.action-add:hover {
  transform: scale(1.15);
  background: rgba(233, 30, 140, 0.1);
}

.action-remove {
  color: #FF9100;
}

.action-remove:hover {
  transform: scale(1.15);
  background: rgba(255, 145, 0, 0.1);
}

.action-edit {
  color: #E91E8C;
}

.action-edit:hover {
  transform: scale(1.15);
  background: rgba(233, 30, 140, 0.1);
}

.action-delete {
  color: #E91E8C;
}

.action-delete:hover {
  transform: scale(1.15);
  color: #C2185B;
  background: rgba(233, 30, 140, 0.1);
}

/* ===== Dialogs ===== */
.inventory-dialog :deep(.q-dialog__backdrop) {
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

.stock-dialog-card {
  min-width: 380px;
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
