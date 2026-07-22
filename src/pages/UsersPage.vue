<template>
  <q-page class="users-page q-pa-md">
    <!-- Header -->
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Users</div>
        <div class="page-subtitle">Manage staff accounts and branch assignments</div>
      </div>
      <q-btn
        label="Add User"
        icon="person_add"
        rounded
        unelevated
        class="add-btn"
        @click="openAddDialog"
      />
    </div>

    <!-- Users table -->
    <q-card class="glass-card data-table">
      <q-table
        :rows="users"
        :columns="userColumns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-role="props">
          <q-td :props="props">
            <q-badge rounded class="role-badge">
              {{ props.row.roleId || 'STAFF' }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge rounded :color="props.row.status === 'active' ? 'green-6' : 'red-6'" class="status-badge">
              {{ props.row.status || 'active' }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat round dense icon="edit" class="action-edit" @click="editUser(props.row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add User Dialog -->
    <q-dialog v-model="showAddDialog" class="user-dialog">
      <q-card class="dialog-card">
        <q-card-section>
          <div class="dialog-title">Add User</div>
          <div class="dialog-subtitle">Create a new staff account and send verification email</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleAddUser" class="q-gutter-md">
            <q-input
              v-model="newUserForm.displayName"
              label="Display Name"
              outlined
              dense
              class="user-input"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="newUserForm.email"
              label="Email"
              type="email"
              outlined
              dense
              class="user-input"
            >
              <template v-slot:prepend>
                <q-icon name="email" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="newUserForm.phone"
              label="Phone Number"
              outlined
              dense
              class="user-input"
            >
              <template v-slot:prepend>
                <q-icon name="phone" color="pink-5" />
              </template>
            </q-input>
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-select
                  v-model="newUserForm.roleId"
                  label="Role"
                  :options="roleOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="user-input"
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="newUserForm.branchId"
                  label="Assigned Branch"
                  :options="branchOptions"
                  outlined
                  dense
                  clearable
                  emit-value
                  map-options
                  class="user-input"
                />
              </div>
            </div>
            <q-input
              v-model="newUserForm.password"
              label="Temporary Password"
              type="password"
              outlined
              dense
              class="user-input"
            >
              <template v-slot:prepend>
                <q-icon name="lock" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="newUserForm.confirmPassword"
              label="Confirm Password"
              type="password"
              outlined
              dense
              class="user-input"
            >
              <template v-slot:prepend>
                <q-icon name="lock" color="pink-5" />
              </template>
            </q-input>
            <div class="row justify-end q-mt-md">
              <q-btn flat rounded label="Cancel" v-close-popup class="cancel-btn q-mr-sm" />
              <q-btn type="submit" rounded unelevated label="Create & Send Verification" class="save-btn" :loading="adding" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Edit User Dialog -->
    <q-dialog v-model="showEditDialog" class="user-dialog">
      <q-card class="dialog-card">
        <q-card-section>
          <div class="dialog-title">Edit User</div>
          <div class="dialog-subtitle">Update account details for {{ editingUser?.email }}</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleSaveUser" class="q-gutter-md">
            <q-input
              v-model="userForm.displayName"
              label="Display Name"
              outlined
              dense
              class="user-input"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="userForm.email"
              label="Email"
              outlined
              dense
              disable
              class="user-input"
            >
              <template v-slot:prepend>
                <q-icon name="email" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="userForm.phone"
              label="Phone Number"
              outlined
              dense
              class="user-input"
            >
              <template v-slot:prepend>
                <q-icon name="phone" color="pink-5" />
              </template>
            </q-input>
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-select
                  v-model="userForm.roleId"
                  label="Role"
                  :options="roleOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="user-input"
                  style="margin-left: 15px; margin-top: 15px"
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="userForm.status"
                  label="Status"
                  :options="statusOptions"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="user-input"
                   style="margin-top: 15px"
                />
              </div>
            </div>
            <q-select
              v-model="userForm.branchId"
              label="Assigned Branch"
              :options="branchOptions"
              outlined
              dense
              clearable
              emit-value
              map-options
              class="user-input"
            />

            <div class="password-info q-pa-md rounded-borders">
              <div class="row items-center">
                <q-icon name="lock" color="pink-5" size="1.2rem" class="q-mr-sm" />
                <div class="text-caption">
                  Passwords cannot be changed directly. Use the button below to send a password reset email.
                </div>
              </div>
            </div>

            <div class="row justify-between items-center q-mt-md">
              <q-btn
                flat
                rounded
                label="Send Password Reset"
                icon="lock_reset"
                class="reset-btn"
                @click="sendResetEmail"
                :loading="resetting"
              />
              <div class="row">
                <q-btn flat rounded label="Cancel" v-close-popup class="cancel-btn q-mr-sm" />
                <q-btn type="submit" rounded unelevated label="Save" class="save-btn" :loading="loading" />
              </div>
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
import { db, auth, app, collection, getDocs, doc, setDoc, updateDoc, serverTimestamp } from '../boot/firebase'
import { sendPasswordResetEmail, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { getApp, initializeApp } from 'firebase/app'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 100))

  if (!userStore.isAuthenticated || !userStore.isAdmin) {
    router.push('/dashboard')
  }
})

const loading = ref(false)
const resetting = ref(false)
const users = ref([])
const branches = ref([])
const showEditDialog = ref(false)
const editingUser = ref(null)

const showAddDialog = ref(false)
const adding = ref(false)
const newUserForm = ref({
  displayName: '',
  email: '',
  phone: '',
  roleId: 'staff',
  branchId: '',
  password: '',
  confirmPassword: ''
})

const userForm = ref({
  displayName: '',
  email: '',
  phone: '',
  roleId: 'staff',
  status: 'active',
  branchId: ''
})

const userColumns = [
  { name: 'displayName', label: 'Name', field: 'displayName', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' },
  { name: 'role', label: 'Role', field: 'roleId', align: 'center' },
  { name: 'branch', label: 'Branch', field: 'branchName', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Staff', value: 'staff' }
]

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

const branchOptions = computed(() =>
  branches.value.map(branch => ({
    label: branch.name,
    value: branch.id
  }))
)

async function loadBranches() {
  try {
    const snapshot = await getDocs(collection(db, 'branches'))
    branches.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading branches:', error)
  }
}

async function loadUsers() {
  loading.value = true
  try {
    const snapshot = await getDocs(collection(db, 'users'))
    users.value = snapshot.docs.map(doc => {
      const data = doc.data()
      const branch = branches.value.find(b => b.id === data.branchId)
      return {
        id: doc.id,
        ...data,
        branchName: branch ? branch.name : data.branchId || '—'
      }
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load users: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  newUserForm.value = {
    displayName: '',
    email: '',
    phone: '',
    roleId: 'staff',
    branchId: '',
    password: '',
    confirmPassword: ''
  }
  showAddDialog.value = true
}

function editUser(user) {
  editingUser.value = user
  userForm.value = {
    displayName: user.displayName || '',
    email: user.email || '',
    phone: user.phone || '',
    roleId: user.roleId || 'staff',
    status: user.status || 'active',
    branchId: user.branchId || ''
  }
  showEditDialog.value = true
}

async function handleSaveUser() {
  if (!editingUser.value) return
  loading.value = true
  try {
    await updateDoc(doc(db, 'users', editingUser.value.id), {
      displayName: userForm.value.displayName,
      phone: userForm.value.phone,
      roleId: userForm.value.roleId,
      status: userForm.value.status,
      branchId: userForm.value.branchId,
      updatedAt: new Date()
    })

    $q.notify({
      type: 'positive',
      message: 'User updated successfully!'
    })

    showEditDialog.value = false
    editingUser.value = null
    await loadUsers()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to update user: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

async function handleAddUser() {
  if (newUserForm.value.password !== newUserForm.value.confirmPassword) {
    $q.notify({
      type: 'negative',
      message: 'Passwords do not match'
    })
    return
  }

  adding.value = true
  try {
    let secondaryApp
    try {
      secondaryApp = getApp('UserCreation')
    } catch (e) {
      secondaryApp = initializeApp(app.options, 'UserCreation')
    }
    const secondaryAuth = getAuth(secondaryApp)

    const credential = await createUserWithEmailAndPassword(secondaryAuth, newUserForm.value.email, newUserForm.value.password)

    const idToken = await credential.user.getIdToken()
    const apiKey = app.options.apiKey
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error?.message || 'Failed to send verification email')
    }

    await setDoc(doc(db, 'users', credential.user.uid), {
      displayName: newUserForm.value.displayName,
      email: newUserForm.value.email,
      phone: newUserForm.value.phone,
      roleId: newUserForm.value.roleId,
      branchId: newUserForm.value.branchId,
      status: 'pending',
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    $q.notify({
      type: 'positive',
      message: 'User created and verification email sent'
    })

    showAddDialog.value = false
    newUserForm.value = {
      displayName: '',
      email: '',
      phone: '',
      roleId: 'staff',
      branchId: '',
      password: '',
      confirmPassword: ''
    }
    await loadUsers()
    await signOut(secondaryAuth)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to create user: ' + error.message
    })
  } finally {
    adding.value = false
  }
}

async function sendResetEmail() {
  if (!userForm.value.email) return
  resetting.value = true
  try {
    await sendPasswordResetEmail(auth, userForm.value.email)
    $q.notify({
      type: 'positive',
      message: 'Password reset email sent to ' + userForm.value.email
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to send reset email: ' + error.message
    })
  } finally {
    resetting.value = false
  }
}

onMounted(async () => {
  await loadBranches()
  await loadUsers()
})
</script>

<style scoped>
/* ===== Pink users page ===== */
.users-page {
  color: #4A2038;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

/* ===== Glass table ===== */
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

.role-badge {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  padding: 4px 12px;
  font-size: 0.8rem;
  font-weight: 700;
}

.status-badge {
  padding: 4px 12px;
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

/* ===== Dialog ===== */
.user-dialog :deep(.q-dialog__backdrop) {
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

.user-input :deep(.q-field__control) {
  border-radius: 14px;
}

.user-input :deep(.q-field__control::before) {
  border-color: rgba(233, 30, 140, 0.35);
}

.user-input :deep(.q-field--focused .q-field__control::after) {
  border-color: #E91E8C;
}

.password-info {
  background: rgba(233, 30, 140, 0.06);
  border: 1px solid rgba(233, 30, 140, 0.15);
  color: #4A2038;
}

.reset-btn {
  color: #E91E8C;
  font-weight: 700;
}

.reset-btn:hover {
  background: rgba(233, 30, 140, 0.08);
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

.add-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  font-weight: 700;
  padding: 0 22px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.35);
}
</style>
