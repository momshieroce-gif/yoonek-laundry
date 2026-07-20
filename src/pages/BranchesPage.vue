<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h4 text-weight-bold">Branches</div>
      <q-btn
        v-if="userStore.isAdmin"
        label="Add Branch"
        color="primary"
        icon="add"
        @click="showAddDialog = true"
      />
    </div>

    <q-card class="data-table">
      <q-table
        :rows="branches"
        :columns="branchColumns"
        row-key="id"
        flat
        bordered
        :loading="loading"
      >
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              icon="edit"
              color="primary"
              @click="editBranch(props.row)"
              v-if="userStore.isAdmin"
            />
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="negative"
              @click="deleteBranch(props.row.id)"
              v-if="userStore.isAdmin"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showAddDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ editingBranch ? 'Edit Branch' : 'Add New Branch' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleSaveBranch" class="q-gutter-md">
            <q-input
              v-model="branchForm.name"
              label="Branch Name"
              outlined
              dense
              :rules="[val => !!val || 'Name is required']"
            />
            <q-input
              v-model="branchForm.address"
              label="Address"
              outlined
              dense
              :rules="[val => !!val || 'Address is required']"
            />
            <q-input
              v-model="branchForm.phone"
              label="Phone"
              outlined
              dense
              :rules="[val => !!val || 'Phone is required']"
            />
            <q-input
              v-model="branchForm.manager"
              label="Manager"
              outlined
              dense
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
import { ref, onMounted } from 'vue'
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
const branches = ref([])
const showAddDialog = ref(false)
const editingBranch = ref(null)

const branchColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'address', label: 'Address', field: 'address', align: 'left' },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' },
  { name: 'manager', label: 'Manager', field: 'manager', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const branchForm = ref({
  name: '',
  address: '',
  phone: '',
  manager: ''
})

async function loadBranches() {
  loading.value = true
  try {
    const snapshot = await getDocs(collection(db, 'branches'))
    branches.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load branches: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function editBranch(branch) {
  editingBranch.value = branch
  branchForm.value = {
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    manager: branch.manager
  }
  showAddDialog.value = true
}

async function handleSaveBranch() {
  loading.value = true
  try {
    if (editingBranch.value) {
      await updateDoc(doc(db, 'branches', editingBranch.value.id), {
        ...branchForm.value,
        updatedAt: new Date()
      })
      $q.notify({
        type: 'positive',
        message: 'Branch updated successfully!'
      })
    } else {
      await addDoc(collection(db, 'branches'), {
        ...branchForm.value,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      $q.notify({
        type: 'positive',
        message: 'Branch added successfully!'
      })
    }
    showAddDialog.value = false
    editingBranch.value = null
    resetForm()
    await loadBranches()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save branch: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function deleteBranch(id) {
  $q.dialog({
    title: 'Delete Branch',
    message: 'Are you sure you want to delete this branch?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await deleteDoc(doc(db, 'branches', id))
      $q.notify({
        type: 'positive',
        message: 'Branch deleted successfully!'
      })
      await loadBranches()
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Failed to delete branch: ' + error.message
      })
    }
  })
}

function resetForm() {
  branchForm.value = {
    name: '',
    address: '',
    phone: '',
    manager: ''
  }
}

onMounted(() => {
  loadBranches()
})
</script>
