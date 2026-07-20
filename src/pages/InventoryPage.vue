<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h4 text-weight-bold">Inventory</div>
      <q-btn
        label="Add Item"
        color="primary"
        icon="add"
        @click="showAddDialog = true"
      />
    </div>

    <!-- Filters -->
    <q-card class="q-pa-md q-mb-md">
      <div class="row q-gutter-md">
        <div class="col-12 col-sm-4">
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
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-select
            v-model="selectedCategory"
            label="Category"
            :options="categoryOptions"
            outlined
            dense
            clearable
          />
        </div>
      </div>
    </q-card>

    <q-card class="data-table">
      <q-table
        :rows="filteredInventory"
        :columns="inventoryColumns"
        row-key="id"
        flat
        bordered
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-quantity="props">
          <q-td :props="props">
            <q-badge :color="props.row.quantity <= props.row.minStock ? 'negative' : 'positive'">
              {{ props.row.quantity }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="getStockStatusColor(props.row)">
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
              icon="add"
              color="green"
              @click="adjustStock(props.row, 'add')"
            />
            <q-btn
              flat
              round
              dense
              icon="remove"
              color="orange"
              @click="adjustStock(props.row, 'remove')"
            />
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="primary"
              @click="editItem(props.row)"
            />
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="negative"
              @click="deleteItem(props.row.id)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showAddDialog">
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ editingItem ? 'Edit Item' : 'Add New Item' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleSaveItem" class="q-gutter-md">
            <q-select
              v-model="itemForm.branchId"
              label="Branch"
              :options="branchOptions"
              outlined
              dense
              emit-value
              map-options
              :rules="[val => !!val || 'Branch is required']"
            />
            <q-input
              v-model="itemForm.name"
              label="Item Name"
              outlined
              dense
              :rules="[val => !!val || 'Item name is required']"
            />
            <q-select
              v-model="itemForm.category"
              label="Category"
              :options="categoryOptions"
              outlined
              dense
              :rules="[val => !!val || 'Category is required']"
            />
            <q-input
              v-model.number="itemForm.quantity"
              label="Quantity"
              type="number"
              outlined
              dense
              :rules="[val => val >= 0 || 'Quantity must be non-negative']"
            />
            <q-input
              v-model.number="itemForm.minStock"
              label="Minimum Stock"
              type="number"
              outlined
              dense
              :rules="[val => val >= 0 || 'Minimum stock must be non-negative']"
            />
            <q-input
              v-model.number="itemForm.unitPrice"
              label="Unit Price"
              type="number"
              outlined
              dense
              step="0.01"
            />
            <q-input
              v-model="itemForm.supplier"
              label="Supplier"
              outlined
              dense
            />
            <q-input
              v-model="itemForm.location"
              label="Storage Location"
              outlined
              dense
            />
            <q-input
              v-model="itemForm.notes"
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

    <!-- Stock Adjustment Dialog -->
    <q-dialog v-model="showStockDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">Adjust Stock</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleStockAdjustment" class="q-gutter-md">
            <q-input
              v-model.number="stockAdjustment"
              :label="adjustmentType === 'add' ? 'Quantity to Add' : 'Quantity to Remove'"
              type="number"
              outlined
              dense
              :rules="[val => val > 0 || 'Quantity must be positive']"
            />
            <div class="row justify-end q-mt-md">
              <q-btn flat label="Cancel" v-close-popup class="q-mr-sm" />
              <q-btn type="submit" label="Confirm" color="primary" :loading="loading" />
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
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (!userStore.isAuthenticated) {
    router.push('/login')
  }
})

const loading = ref(false)
const inventory = ref([])
const branches = ref([])
const showAddDialog = ref(false)
const showStockDialog = ref(false)
const editingItem = ref(null)
const selectedItem = ref(null)
const adjustmentType = ref('add')
const stockAdjustment = ref(0)
const searchText = ref('')
const selectedBranch = ref('')
const selectedCategory = ref('')

const inventoryColumns = [
  { name: 'name', label: 'Item Name', field: 'name', align: 'left', sortable: true },
  { name: 'category', label: 'Category', field: 'category', align: 'left' },
  { name: 'quantity', label: 'Quantity', field: 'quantity', align: 'center' },
  { name: 'minStock', label: 'Min Stock', field: 'minStock', align: 'center' },
  { name: 'unitPrice', label: 'Unit Price', field: 'unitPrice', align: 'right' },
  { name: 'supplier', label: 'Supplier', field: 'supplier', align: 'left' },
  { name: 'location', label: 'Location', field: 'location', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const categoryOptions = ['Detergent', 'Fabric Softener', 'Bleach', 'Hangers', 'Packaging', 'Equipment', 'Other']

const branchOptions = computed(() => 
  branches.value.map(branch => ({
    label: branch.name,
    value: branch.id
  }))
)

const filteredInventory = computed(() => {
  let result = inventory.value

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(item => 
      item.name.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search) ||
      item.supplier.toLowerCase().includes(search)
    )
  }

  if (selectedBranch.value) {
    result = result.filter(item => item.branchId === selectedBranch.value)
  }

  if (selectedCategory.value) {
    result = result.filter(item => item.category === selectedCategory.value)
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
  if (item.quantity <= 0) return 'Out of Stock'
  if (item.quantity <= item.minStock) return 'Low Stock'
  return 'In Stock'
}

function getStockStatusColor(item) {
  if (item.quantity <= 0) return 'negative'
  if (item.quantity <= item.minStock) return 'warning'
  return 'positive'
}

const itemForm = ref({
  branchId: '',
  name: '',
  category: '',
  quantity: 0,
  minStock: 10,
  unitPrice: 0,
  supplier: '',
  location: '',
  notes: ''
})

function editItem(item) {
  editingItem.value = item
  itemForm.value = {
    branchId: item.branchId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    minStock: item.minStock,
    unitPrice: item.unitPrice,
    supplier: item.supplier,
    location: item.location,
    notes: item.notes
  }
  showAddDialog.value = true
}

async function handleSaveItem() {
  loading.value = true
  try {
    if (editingItem.value) {
      await updateDoc(doc(db, 'inventory', editingItem.value.id), {
        ...itemForm.value,
        updatedAt: new Date()
      })
      $q.notify({
        type: 'positive',
        message: 'Item updated successfully!'
      })
    } else {
      await addDoc(collection(db, 'inventory'), {
        ...itemForm.value,
        createdBy: userStore.user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      $q.notify({
        type: 'positive',
        message: 'Item added successfully!'
      })
    }
    showAddDialog.value = false
    editingItem.value = null
    resetForm()
    await loadInventory()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save item: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function adjustStock(item, type) {
  selectedItem.value = item
  adjustmentType.value = type
  stockAdjustment.value = 0
  showStockDialog.value = true
}

async function handleStockAdjustment() {
  loading.value = true
  try {
    const newQuantity = adjustmentType.value === 'add' 
      ? selectedItem.value.quantity + stockAdjustment.value
      : Math.max(0, selectedItem.value.quantity - stockAdjustment.value)

    await updateDoc(doc(db, 'inventory', selectedItem.value.id), {
      quantity: newQuantity,
      updatedAt: new Date()
    })

    $q.notify({
      type: 'positive',
      message: `Stock ${adjustmentType.value === 'add' ? 'added' : 'removed'} successfully!`
    })

    showStockDialog.value = false
    await loadInventory()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to adjust stock: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function deleteItem(id) {
  $q.dialog({
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await deleteDoc(doc(db, 'inventory', id))
      $q.notify({
        type: 'positive',
        message: 'Item deleted successfully!'
      })
      await loadInventory()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Failed to delete item: ' + error.message
      })
    }
  })
}

function resetForm() {
  itemForm.value = {
    branchId: '',
    name: '',
    category: '',
    quantity: 0,
    minStock: 10,
    unitPrice: 0,
    supplier: '',
    location: '',
    notes: ''
  }
}

onMounted(() => {
  loadBranches()
  loadInventory()
})
</script>
