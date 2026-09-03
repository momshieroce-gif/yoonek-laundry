<template>
  <q-page class="accounts-page q-pa-md">
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Chart of Accounts</div>
        <div class="page-subtitle">Manage the accounts used for financial records</div>
      </div>
      <q-btn color="pink-7" icon="add" label="New Account" unelevated @click="openCreateDialog" />
    </div>

    <div class="table-toolbar q-pa-md">
      <q-input
        v-model.trim="search"
        outlined
        dense
        clearable
        label="Search accounts"
        color="pink-7"
        class="search-input"
      >
        <template v-slot:prepend>
          <q-icon name="search" color="pink-7" />
        </template>
      </q-input>
      <q-btn flat round icon="refresh" color="pink-7" :loading="loading" @click="loadAccounts">
        <q-tooltip>Refresh accounts</q-tooltip>
      </q-btn>
    </div>

    <q-table
      class="accounts-table"
      flat
      row-key="id"
      :rows="accounts"
      :columns="columns"
      :filter="search"
      :loading="loading"
      :pagination="{ rowsPerPage: 10 }"
      no-data-label="No accounts found."
    >
      <template v-slot:body-cell-code="props">
        <q-td :props="props"><span class="account-code">{{ props.value }}</span></q-td>
      </template>
      <template v-slot:body-cell-type="props">
        <q-td :props="props"><q-badge outline color="pink-7" :label="formatLabel(props.value)" /></q-td>
      </template>
      <template v-slot:body-cell-normalBalance="props">
        <q-td :props="props">{{ formatLabel(props.value) }}</q-td>
      </template>
      <template v-slot:body-cell-isActive="props">
        <q-td :props="props">
          <q-badge :color="props.value ? 'positive' : 'grey-6'" :label="props.value ? 'Active' : 'Inactive'" />
        </q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat round dense icon="edit" color="pink-7" @click="openEditDialog(props.row)">
            <q-tooltip>Edit account</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)">
            <q-tooltip>Delete account</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="accountDialog" persistent>
      <q-card class="account-dialog">
        <q-card-section class="dialog-header row items-center q-col-gutter-md">
          <div class="col-auto">
            <q-avatar color="pink-1" text-color="pink-8" icon="account_tree" />
          </div>
          <div class="col">
            <div class="dialog-title">{{ editingAccountId ? 'Edit Account' : 'New Account' }}</div>
            <div class="dialog-subtitle">Enter the chart of account details</div>
          </div>
        </q-card-section>

        <q-form @submit="saveAccount">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model.trim="accountForm.code"
              outlined
              dense
              label="Account Code"
              color="pink-7"
              maxlength="20"
              :disable="Boolean(editingAccountId)"
              :rules="[
                (value) => !!value || 'Account code is required',
                (value) => /^[A-Za-z0-9-]+$/.test(value) || 'Use letters, numbers, or hyphens only'
              ]"
            />
            <q-input
              v-model.trim="accountForm.name"
              outlined
              dense
              label="Account Name"
              color="pink-7"
              :rules="[(value) => !!value || 'Account name is required']"
            />
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="accountForm.type"
                  outlined
                  dense
                  emit-value
                  map-options
                  label="Account Type"
                  color="pink-7"
                  :options="typeOptions"
                  :rules="[(value) => !!value || 'Account type is required']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="accountForm.normalBalance"
                  outlined
                  dense
                  emit-value
                  map-options
                  label="Normal Balance"
                  color="pink-7"
                  :options="balanceOptions"
                  :rules="[(value) => !!value || 'Normal balance is required']"
                />
              </div>
            </div>
            <q-toggle v-model="accountForm.isActive" color="pink-7" label="Active account" />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="Cancel" color="grey-7" :disable="saving" v-close-popup />
            <q-btn
              unelevated
              type="submit"
              icon="save"
              :label="editingAccountId ? 'Update Account' : 'Create Account'"
              color="pink-7"
              :loading="saving"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from '../boot/firebase'

const $q = useQuasar()
const accounts = ref([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const accountDialog = ref(false)
const editingAccountId = ref(null)

const typeOptions = [
  { label: 'Asset', value: 'asset' },
  { label: 'Liability', value: 'liability' },
  { label: 'Equity', value: 'equity' },
  { label: 'Revenue', value: 'revenue' },
  { label: 'Expense', value: 'expense' }
]

const balanceOptions = [
  { label: 'Debit', value: 'debit' },
  { label: 'Credit', value: 'credit' }
]

const columns = [
  { name: 'code', label: 'Code', field: 'code', align: 'left', sortable: true },
  { name: 'name', label: 'Account Name', field: 'name', align: 'left', sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'left', sortable: true },
  { name: 'normalBalance', label: 'Normal Balance', field: 'normalBalance', align: 'left', sortable: true },
  { name: 'isActive', label: 'Status', field: 'isActive', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const accountForm = ref(createEmptyForm())

function createEmptyForm () {
  return {
    code: '',
    name: '',
    type: 'asset',
    normalBalance: 'debit',
    isActive: true
  }
}

function formatLabel (value) {
  if (!value) return '—'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

async function loadAccounts () {
  loading.value = true
  try {
    const snapshot = await getDocs(collection(db, 'accounts'))
    accounts.value = snapshot.docs
      .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
      .sort((first, second) => first.code.localeCompare(second.code, undefined, { numeric: true }))
  } catch (error) {
    console.error('Could not load accounts:', error)
    $q.notify({ type: 'negative', message: 'Could not load accounts.' })
  } finally {
    loading.value = false
  }
}

function openCreateDialog () {
  editingAccountId.value = null
  accountForm.value = createEmptyForm()
  accountDialog.value = true
}

function openEditDialog (account) {
  editingAccountId.value = account.id
  accountForm.value = {
    code: account.code,
    name: account.name,
    type: account.type,
    normalBalance: account.normalBalance,
    isActive: account.isActive !== false
  }
  accountDialog.value = true
}

async function saveAccount () {
  const code = accountForm.value.code
  const accountData = {
    code,
    name: accountForm.value.name,
    type: accountForm.value.type,
    normalBalance: accountForm.value.normalBalance,
    isActive: accountForm.value.isActive,
    updatedAt: serverTimestamp()
  }

  saving.value = true
  try {
    if (editingAccountId.value) {
      await updateDoc(doc(db, 'accounts', editingAccountId.value), accountData)
    } else {
      const accountRef = doc(db, 'accounts', code)
      const existingAccount = await getDoc(accountRef)
      if (existingAccount.exists()) {
        $q.notify({ type: 'warning', message: `Account code ${code} already exists.` })
        return
      }
      await setDoc(accountRef, {
        ...accountData,
        createdAt: serverTimestamp()
      })
    }

    accountDialog.value = false
    $q.notify({
      type: 'positive',
      message: editingAccountId.value ? 'Account updated.' : 'Account created.'
    })
    await loadAccounts()
  } catch (error) {
    console.error('Could not save account:', error)
    $q.notify({ type: 'negative', message: 'Could not save account.' })
  } finally {
    saving.value = false
  }
}

function confirmDelete (account) {
  $q.dialog({
    title: 'Delete Account',
    message: `Delete ${account.code} - ${account.name}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await deleteDoc(doc(db, 'accounts', account.id))
      $q.notify({ type: 'positive', message: 'Account deleted.' })
      await loadAccounts()
    } catch (error) {
      console.error('Could not delete account:', error)
      $q.notify({ type: 'negative', message: 'Could not delete account.' })
    }
  })
}

onMounted(loadAccounts)
</script>

<style scoped>
.accounts-page {
  color: #4a2038;
  max-width: 1180px;
}

.page-header,
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1.15;
}

.page-subtitle,
.dialog-subtitle {
  color: #8a4e71;
}

.table-toolbar {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(194, 24, 91, 0.16);
  border-left: 4px solid #c2185b;
  border-radius: 8px 8px 0 0;
}

.search-input {
  width: 360px;
  max-width: 100%;
}

.accounts-table {
  border: 1px solid rgba(194, 24, 91, 0.14);
  border-top: 0;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 10px 28px rgba(194, 24, 91, 0.08);
}

.account-code {
  color: #c2185b;
  font-weight: 800;
}

.account-dialog {
  width: 520px;
  max-width: 92vw;
  border-top: 4px solid #c2185b;
  border-radius: 8px;
}

.dialog-header {
  border-bottom: 1px solid rgba(194, 24, 91, 0.14);
}

.dialog-title {
  font-size: 1.15rem;
  font-weight: 800;
}

@media (max-width: 599px) {
  .page-header,
  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }
}
</style>