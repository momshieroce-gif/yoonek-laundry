<template>
  <q-page class="branches-page q-pa-md">
    <!-- Page header -->
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Branches</div>
        <div class="page-subtitle">Manage your laundry branches and locations</div>
      </div>
      <q-btn
        v-if="userStore.isAdmin"
        label="Add Branch"
        icon="add"
        rounded
        unelevated
        class="add-btn"
        @click="showAddDialog = true"
      />
    </div>

    <!-- Branches table -->
    <q-card class="glass-card data-table">
      <q-table
        :rows="branches"
        :columns="branchColumns"
        row-key="id"
        flat
        :loading="loading"
      >
        <template v-slot:body-cell-openingCapital="props">
          <q-td :props="props">{{ formatCurrency(props.value) }}</q-td>
        </template>
        <template v-slot:body-cell-equityAccountId="props">
          <q-td :props="props">{{ getAccountLabel(props.value) }}</q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              dense
              icon="edit"
              class="action-edit"
              @click="editBranch(props.row)"
              v-if="userStore.isAdmin"
            />
            <q-btn
              flat
              round
              dense
              icon="delete"
              class="action-delete"
              @click="deleteBranch(props.row)"
              v-if="userStore.isAdmin"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Add/Edit Dialog -->
    <q-dialog v-model="showAddDialog" class="branch-dialog">
      <q-card class="dialog-card">
        <q-card-section>
          <div class="dialog-title">{{ editingBranch ? 'Edit Branch' : 'Add New Branch' }}</div>
          <div class="dialog-subtitle">Fill in the branch details below</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleSaveBranch" class="q-gutter-md">
            <q-input
              v-model="branchForm.name"
              label="Branch Name"
              outlined
              dense
              class="branch-input"
              :rules="[val => !!val || 'Name is required']"
            >
              <template v-slot:prepend>
                <q-icon name="store" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="branchForm.address"
              label="Address"
              outlined
              dense
              class="branch-input"
              :rules="[val => !!val || 'Address is required']"
            >
              <template v-slot:prepend>
                <q-icon name="location_on" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="branchForm.phone"
              label="Phone"
              outlined
              dense
              class="branch-input"
              :rules="[val => !!val || 'Phone is required']"
            >
              <template v-slot:prepend>
                <q-icon name="phone" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model="branchForm.manager"
              label="Manager"
              outlined
              dense
              class="branch-input"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="pink-5" />
              </template>
            </q-input>
            <q-input
              v-model.number="branchForm.openingCapital"
              label="Opening Capital"
              outlined
              dense
              type="number"
              min="0"
              step="0.01"
              prefix="₱"
              class="branch-input"
              hint="Optional. Debits Cash and credits the selected equity account."
              :rules="[(value) => Number(value) >= 0 || 'Opening capital cannot be negative']"
            >
              <template v-slot:prepend>
                <q-icon name="account_balance" color="pink-5" />
              </template>
            </q-input>
            <q-select
              v-model="branchForm.equityAccountId"
              label="Equity Account"
              outlined
              dense
              emit-value
              map-options
              color="pink-7"
              class="branch-input"
              :options="equityAccountOptions"
              :loading="loadingAccounts"
              :rules="[(value) => Number(branchForm.openingCapital) <= 0 || !!value || 'Equity account is required']"
            >
              <template v-slot:prepend>
                <q-icon name="account_tree" color="pink-5" />
              </template>
            </q-select>
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
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { db, collection, getDoc, getDocs, doc, writeBatch, serverTimestamp } from '../boot/firebase'
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
const loadingAccounts = ref(false)
const branches = ref([])
const accounts = ref([])
const showAddDialog = ref(false)
const editingBranch = ref(null)

const branchColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'address', label: 'Address', field: 'address', align: 'left' },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' },
  { name: 'manager', label: 'Manager', field: 'manager', align: 'left' },
  { name: 'openingCapital', label: 'Opening Capital', field: 'openingCapital', align: 'right', sortable: true },
  { name: 'equityAccountId', label: 'Equity Account', field: 'equityAccountId', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const equityAccountOptions = computed(() => accounts.value
  .filter((account) => account.type === 'equity' && account.isActive !== false)
  .map((account) => ({ label: `${account.code} - ${account.name}`, value: account.id })))

const branchForm = ref({
  name: '',
  address: '',
  phone: '',
  manager: '',
  openingCapital: null,
  equityAccountId: '3000'
})

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value) || 0)
}

function getAccountLabel(accountId) {
  if (!accountId) return '—'
  const account = accounts.value.find((item) => item.id === accountId)
  return account ? `${account.code} - ${account.name}` : accountId
}

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

async function loadAccounts() {
  loadingAccounts.value = true
  try {
    const snapshot = await getDocs(collection(db, 'accounts'))
    accounts.value = snapshot.docs
      .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
      .sort((first, second) => first.code.localeCompare(second.code, undefined, { numeric: true }))
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load equity accounts: ' + error.message
    })
  } finally {
    loadingAccounts.value = false
  }
}

function editBranch(branch) {
  editingBranch.value = branch
  branchForm.value = {
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    manager: branch.manager,
    openingCapital: Number(branch.openingCapital) || 0,
    equityAccountId: branch.equityAccountId || '3000'
  }
  showAddDialog.value = true
}

async function handleSaveBranch() {
  loading.value = true
  try {
    const openingCapital = Number(branchForm.value.openingCapital) || 0
    const equityAccountId = branchForm.value.equityAccountId
    const branchRef = editingBranch.value
      ? doc(db, 'branches', editingBranch.value.id)
      : doc(collection(db, 'branches'))
    const journalEntryId = editingBranch.value?.openingJournalEntryId || `branch-${branchRef.id}`
    const journalEntryRef = doc(db, 'journalEntries', journalEntryId)
    const batch = writeBatch(db)

    if (editingBranch.value?.openingJournalEntryId) {
      const journalSnapshot = await getDoc(journalEntryRef)
      if (journalSnapshot.exists() && journalSnapshot.data().status !== 'draft') {
        $q.notify({ type: 'warning', message: 'Opening capital cannot be changed because its journal entry is no longer a draft.' })
        return
      }
    }

    if (openingCapital > 0) {
      const [cashAccount, equityAccount] = await Promise.all([
        getDoc(doc(db, 'accounts', '1000')),
        getDoc(doc(db, 'accounts', equityAccountId))
      ])
      if (
        !cashAccount.exists() ||
        cashAccount.data().isActive === false ||
        !equityAccount.exists() ||
        equityAccount.data().type !== 'equity' ||
        equityAccount.data().isActive === false
      ) {
        throw new Error('Cash (1000) and a valid equity account are required.')
      }
    }

    const branchData = {
      name: branchForm.value.name,
      address: branchForm.value.address,
      phone: branchForm.value.phone,
      manager: branchForm.value.manager,
      openingCapital,
      equityAccountId: openingCapital > 0 ? equityAccountId : '',
      openingJournalEntryId: openingCapital > 0 ? journalEntryId : '',
      updatedAt: serverTimestamp()
    }

    if (editingBranch.value) {
      batch.update(branchRef, branchData)
    } else {
      batch.set(branchRef, {
        ...branchData,
        createdAt: serverTimestamp(),
        createdBy: userStore.user?.uid || ''
      })
    }

    if (openingCapital > 0) {
      const transactionDate = editingBranch.value?.createdAt || serverTimestamp()
      const journalEntryData = {
        description: `Opening capital for ${branchForm.value.name}`,
        referenceType: 'branchOpeningCapital',
        referenceId: branchRef.id,
        totalDebit: openingCapital,
        totalCredit: openingCapital,
        status: 'draft',
        branchId: branchRef.id,
        lines: [
          { accountId: '1000', debit: openingCapital, credit: 0 },
          { accountId: equityAccountId, debit: 0, credit: openingCapital }
        ]
      }
      if (!editingBranch.value?.openingJournalEntryId) {
        journalEntryData.transactionDate = transactionDate
        journalEntryData.createdAt = transactionDate
        journalEntryData.createdBy = userStore.user?.uid || ''
      }
      batch.set(journalEntryRef, journalEntryData, { merge: true })
    } else if (editingBranch.value?.openingJournalEntryId) {
      batch.delete(journalEntryRef)
    }

    await batch.commit()
    $q.notify({
      type: 'positive',
      message: editingBranch.value ? 'Branch updated successfully!' : 'Branch added successfully!'
    })
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

function deleteBranch(branch) {
  $q.dialog({
    title: 'Delete Branch',
    message: 'Are you sure you want to delete this branch?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'branches', branch.id))
      if (branch.openingJournalEntryId) {
        batch.delete(doc(db, 'journalEntries', branch.openingJournalEntryId))
      }
      await batch.commit()
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
    manager: '',
    openingCapital: null,
    equityAccountId: '3000'
  }
}

onMounted(() => {
  Promise.all([loadBranches(), loadAccounts()])
})
</script>

<style scoped>
/* ===== Pink branches page ===== */
.branches-page {
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

/* ===== Glass table card ===== */
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

.action-delete {
  color: #E91E8C;
  transition: transform 0.2s ease;
}

.action-delete:hover {
  transform: scale(1.15);
  color: #C2185B;
  background: rgba(233, 30, 140, 0.1);
}

/* ===== Dialog ===== */
.branch-dialog :deep(.q-dialog__backdrop) {
  background: rgba(74, 32, 56, 0.45);
  backdrop-filter: blur(4px);
}

.dialog-card {
  min-width: 420px;
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

.branch-input :deep(.q-field__control) {
  border-radius: 14px;
}

.branch-input :deep(.q-field__control::before) {
  border-color: rgba(233, 30, 140, 0.35);
}

.branch-input :deep(.q-field--focused .q-field__control::after) {
  border-color: #E91E8C;
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
