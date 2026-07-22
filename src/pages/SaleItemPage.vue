<template>
  <q-page class="sale-item-page q-pa-md">
    <!-- Header -->
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Service Types</div>
        <div class="page-subtitle">Manage laundry services and pricing by branch</div>
      </div>
      <q-btn
        label="Add Service Type"
        icon="add"
        rounded
        unelevated
        class="add-btn"
        @click="openAddDialog"
      />
    </div>

    <!-- Filters -->
    <q-card class="filter-card q-pa-md q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-6">
          <q-input
            v-model="searchText"
            label="Search service types"
            outlined
            dense
            clearable
            class="sale-item-input"
          >
            <template v-slot:prepend>
              <q-icon name="search" color="pink-5" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6">
          <q-select
            v-model="selectedBranch"
            label="Branch"
            :options="branchOptions"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="sale-item-input"
          />
        </div>
      </div>
    </q-card>

    <!-- Service Types table -->
    <q-card class="glass-card data-table">
      <q-table
        :rows="filteredSaleItems"
        :columns="saleItemColumns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-price="props">
          <q-td :props="props">
            {{ formatCurrency(props.row.price) }}
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
              @click="editItem(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showDialog" class="sale-item-dialog">
      <q-card class="dialog-card">
        <q-card-section>
          <div class="dialog-title">{{ editingItem ? 'Edit Service Type' : 'Add Service Type' }}</div>
          <div class="dialog-subtitle">Enter the service type details</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleSave" class="q-gutter-md">
            <q-select
              v-model="itemForm.branchId"
              label="Branch"
              :options="branchOptions"
              outlined
              dense
              emit-value
              map-options
              :disable="!userStore.isAdmin"
              class="sale-item-input"
              :rules="[val => !!val || 'Branch is required']"
            />
            <q-input
              v-model="itemForm.name"
              label="Service Type Name"
              outlined
              dense
              class="sale-item-input"
              :rules="[val => !!val || 'Service type name is required']"
            >
              <template v-slot:prepend>
                <q-icon name="label" color="pink-5" />
              </template>
            </q-input>
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-select
                  v-model="itemForm.unit"
                  label="Unit"
                  :options="unitOptions"
                  outlined
                  dense
                  class="sale-item-input"
                  style="margin-left: 15px"
                  :rules="[val => !!val || 'Unit is required']"
                >
                  <template v-slot:prepend>
                    <q-icon name="straighten" color="pink-5" />
                  </template>
                </q-select>
              </div>
              <div class="col-6">
                <q-input
                  v-model.number="itemForm.minimumPerUnit"
                  label="Minimum Per Unit"
                  type="number"
                  outlined
                  dense
                  class="sale-item-input"
                  :rules="[val => val >= 0 || 'Minimum must be non-negative']"
                >
                  <template v-slot:prepend>
                    <q-icon name="low_priority" color="pink-5" />
                  </template>
                </q-input>
              </div>
            </div>
            <q-input
              v-model.number="itemForm.price"
              label="Price"
              type="number"
              outlined
              dense
              step="0.01"
              class="sale-item-input"
              :rules="[val => val >= 0 || 'Price must be non-negative']"
            >
              <template v-slot:prepend>
                <q-icon name="fa-solid fa-peso-sign" color="pink-5" />
              </template>
            </q-input>
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
import { db, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from '../boot/firebase'
import { useQuasar } from 'quasar'
import { formatCurrency } from '../utils/currency'

const $q = useQuasar()
const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 100))

  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }

  selectedBranch.value = ''
  await loadBranches()
  await loadSaleItems()
})

const loading = ref(false)
const saleItems = ref([])
const branches = ref([])
const showDialog = ref(false)
const editingItem = ref(null)
const searchText = ref('')
const selectedBranch = ref('')

const saleItemColumns = [
  { name: 'name', label: 'Service Type', field: 'name', align: 'left', sortable: true },
  { name: 'branchName', label: 'Branch', field: 'branchName', align: 'left' },
  { name: 'unit', label: 'Unit', field: 'unit', align: 'center' },
  { name: 'minimumPerUnit', label: 'Min / Unit', field: 'minimumPerUnit', align: 'right' },
  { name: 'price', label: 'Price', field: 'price', align: 'right' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const unitOptions = ['kg', 'pc', 'minutes', 'hours']

const branchOptions = computed(() =>
  branches.value.map(branch => ({
    label: branch.name,
    value: branch.id
  }))
)

function resolveBranch(item) {
  if (item.branchId) {
    const branch = branches.value.find(b => b.id === item.branchId)
    if (branch) return { branchId: item.branchId, branchName: branch.name }
  }
  if (item.branch) {
    const byId = branches.value.find(b => b.id === item.branch)
    if (byId) return { branchId: byId.id, branchName: byId.name }
    const byName = branches.value.find(b => b.name && b.name.toLowerCase() === String(item.branch).toLowerCase())
    if (byName) return { branchId: byName.id, branchName: byName.name }
  }
  return { branchId: '', branchName: 'Unknown' }
}

const filteredSaleItems = computed(() => {
  let result = saleItems.value.map(item => {
    const resolved = resolveBranch(item)
    return {
      ...item,
      branchId: resolved.branchId,
      branchName: resolved.branchName
    }
  })

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(item =>
      (item.name || '').toLowerCase().includes(search) ||
      (item.branchName || '').toLowerCase().includes(search)
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

async function loadSaleItems() {
  loading.value = true
  try {
    const snapshot = await getDocs(collection(db, 'service_types'))
    saleItems.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load service types: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

const itemForm = ref({
  branchId: '',
  name: '',
  unit: 'kg',
  minimumPerUnit: 1,
  price: 0
})

function openAddDialog() {
  editingItem.value = null
  itemForm.value = {
    branchId: selectedBranch.value || userStore.userData?.branchId || '',
    name: '',
    unit: 'kg',
    minimumPerUnit: 1,
    price: 0
  }
  showDialog.value = true
}

function editItem(item) {
  editingItem.value = item
  itemForm.value = {
    branchId: item.branchId,
    name: item.name,
    unit: item.unit || 'kg',
    minimumPerUnit: item.minimumPerUnit ?? 1,
    price: item.price
  }
  showDialog.value = true
}

function getBranchNameById(branchId) {
  const branch = branches.value.find(b => b.id === branchId)
  return branch?.name || ''
}

async function handleSave() {
  loading.value = true
  try {
    const data = {
      name: itemForm.value.name,
      branchId: itemForm.value.branchId,
      branchName: getBranchNameById(itemForm.value.branchId),
      unit: itemForm.value.unit,
      minimumPerUnit: itemForm.value.minimumPerUnit,
      price: itemForm.value.price,
      updatedAt: serverTimestamp()
    }

    if (editingItem.value) {
      await updateDoc(doc(db, 'service_types', editingItem.value.id), data)
      $q.notify({ type: 'positive', message: 'Service type updated successfully' })
    } else {
      await addDoc(collection(db, 'service_types'), {
        ...data,
        createdAt: serverTimestamp(),
        createdBy: userStore.user?.uid
      })
      $q.notify({ type: 'positive', message: 'Service type added successfully' })
    }

    showDialog.value = false
    editingItem.value = null
    resetForm()
    await loadSaleItems()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save service type: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function resetForm() {
  itemForm.value = {
    branchId: '',
    name: '',
    unit: 'kg',
    minimumPerUnit: 1,
    price: 0
  }
}
</script>

<style scoped>
/* ===== Pink sale item page ===== */
.sale-item-page {
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

.sale-item-input :deep(.q-field__control) {
  border-radius: 14px;
}

.sale-item-input :deep(.q-field__control::before) {
  border-color: rgba(233, 30, 140, 0.35);
}

.sale-item-input :deep(.q-field--focused .q-field__control::after) {
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

.action-edit {
  color: #E91E8C;
  transition: transform 0.2s ease;
}

.action-edit:hover {
  transform: scale(1.15);
  background: rgba(233, 30, 140, 0.1);
}

/* ===== Dialogs ===== */
.sale-item-dialog :deep(.q-dialog__backdrop) {
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
