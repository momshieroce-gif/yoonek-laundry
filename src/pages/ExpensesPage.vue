<template>
  <q-page class="expenses-page q-pa-md">
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Expenses</div>
        <div class="page-subtitle">Record and review branch operating expenses</div>
      </div>
      <q-btn
        color="pink-7"
        icon="add"
        label="New Expense"
        unelevated
        :disable="!selectedBranch"
        @click="openCreateDialog"
      />
    </div>

    <section class="filter-panel q-pa-md q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-5">
          <q-select
            v-model="selectedBranch"
            outlined
            dense
            emit-value
            map-options
            label="Branch"
            color="pink-7"
            :options="branchOptions"
            :loading="loadingBranches"
            :disable="userStore.isStaff"
          >
            <template v-slot:prepend>
              <q-icon name="store" color="pink-7" />
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-5 col-md-3">
          <q-input v-model="startDate" outlined dense type="date" label="Start Date" color="pink-7" />
        </div>
        <div class="col-12 col-sm-5 col-md-3">
          <q-input v-model="endDate" outlined dense type="date" label="End Date" color="pink-7" />
        </div>
        <div class="col-12 col-sm-2 col-md-1">
          <q-btn
            flat
            round
            icon="filter_alt_off"
            color="grey-7"
            :disable="!startDate && !endDate"
            @click="clearDateFilters"
          >
            <q-tooltip>Clear date filters</q-tooltip>
          </q-btn>
        </div>
      </div>
    </section>

    <div class="summary-row q-mb-md">
      <div>
        <div class="summary-label">Filtered total</div>
        <div class="summary-amount">{{ formatCurrency(filteredTotal) }}</div>
      </div>
      <q-btn flat round icon="refresh" color="pink-7" :loading="loadingExpenses" @click="loadExpenses">
        <q-tooltip>Refresh expenses</q-tooltip>
      </q-btn>
    </div>

    <q-table
      class="expenses-table"
      flat
      row-key="id"
      :rows="filteredExpenses"
      :columns="columns"
      :loading="loadingExpenses"
      :pagination="{ rowsPerPage: 10 }"
      no-data-label="No expenses match these filters."
    >
      <template v-slot:body-cell-amount="props">
        <q-td :props="props"><span class="amount-cell">{{ formatCurrency(props.value) }}</span></q-td>
      </template>
      <template v-slot:body-cell-createdAt="props">
        <q-td :props="props">{{ formatDateTime(props.value) }}</q-td>
      </template>
      <template v-slot:body-cell-notes="props">
        <q-td :props="props"><div class="notes-cell">{{ props.value || '—' }}</div></q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat round dense icon="edit" color="pink-7" @click="openEditDialog(props.row)">
            <q-tooltip>Edit expense</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)">
            <q-tooltip>Delete expense</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="createDialog" persistent>
      <q-card class="expense-dialog">
        <q-card-section class="dialog-header row items-center q-col-gutter-md">
          <div class="col-auto">
            <q-avatar color="pink-1" text-color="pink-8" icon="receipt_long" />
          </div>
          <div class="col">
            <div class="dialog-title">{{ editingExpenseId ? 'Edit Expense' : 'New Expense' }}</div>
            <div class="dialog-subtitle">
              {{ editingExpenseId ? 'Update this expense' : `Add an expense for ${selectedBranchName}` }}
            </div>
          </div>
        </q-card-section>

        <q-form @submit="saveExpense">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model.trim="expenseForm.name"
              outlined
              dense
              label="Expense Name"
              color="pink-7"
              autofocus
              :rules="[(value) => !!value || 'Expense name is required']"
            />
            <q-select
              v-model="expenseForm.accountId"
              outlined
              dense
              emit-value
              map-options
              label="Expense Account"
              color="pink-7"
              :options="expenseAccountOptions"
              :loading="loadingAccounts"
              :rules="[(value) => !!value || 'Expense account is required']"
            >
              <template v-slot:prepend>
                <q-icon name="account_tree" color="pink-7" />
              </template>
            </q-select>
            <q-input
              v-model.number="expenseForm.amount"
              outlined
              dense
              type="number"
              min="0.01"
              step="0.01"
              prefix="₱"
              label="Amount"
              color="pink-7"
              :rules="[(value) => Number(value) > 0 || 'Amount must be greater than 0']"
            />
            <q-input
              v-model.trim="expenseForm.notes"
              outlined
              type="textarea"
              rows="4"
              label="Notes"
              color="pink-7"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="Cancel" color="grey-7" :disable="savingExpense" v-close-popup />
            <q-btn
              unelevated
              type="submit"
              icon="save"
              :label="editingExpenseId ? 'Update Expense' : 'Save Expense'"
              color="pink-7"
              :loading="savingExpense"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { db, collection, doc, getDoc, getDocs, writeBatch, serverTimestamp } from '../boot/firebase'
import { useUserStore } from '../stores/user'

const $q = useQuasar()
const userStore = useUserStore()

const branches = ref([])
const accounts = ref([])
const expenses = ref([])
const selectedBranch = ref('')
const startDate = ref('')
const endDate = ref('')
const loadingBranches = ref(false)
const loadingAccounts = ref(false)
const loadingExpenses = ref(false)
const savingExpense = ref(false)
const createDialog = ref(false)
const editingExpenseId = ref(null)
const editingExpenseCreatedAt = ref(null)
const editingExpenseUserId = ref('')
const editingExpenseBranchId = ref('')
const expenseForm = ref({ name: '', accountId: '', amount: null, notes: '' })

const columns = [
  { name: 'name', label: 'Expense', field: 'name', align: 'left', sortable: true },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right', sortable: true },
  { name: 'createdAt', label: 'Date & Time', field: 'createdAt', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const branchOptions = computed(() => branches.value.map((branch) => ({
  label: branch.name,
  value: branch.id
})))

const expenseAccountOptions = computed(() => accounts.value
  .filter((account) => account.type === 'expense' && account.isActive !== false)
  .map((account) => ({ label: `${account.code} - ${account.name}`, value: account.id })))

const selectedBranchName = computed(() => (
  branches.value.find((branch) => branch.id === selectedBranch.value)?.name || 'selected branch'
))

const filteredExpenses = computed(() => {
  const start = startDate.value ? buildManilaDateBoundary(startDate.value) : null
  const end = endDate.value ? buildManilaDateBoundary(endDate.value, true) : null

  return expenses.value.filter((expense) => {
    if (!selectedBranch.value || expense.branchId !== selectedBranch.value) return false
    const createdAt = toDate(expense.createdAt)
    if (start && (!createdAt || createdAt < start)) return false
    if (end && (!createdAt || createdAt > end)) return false
    return true
  })
})

const filteredTotal = computed(() => (
  filteredExpenses.value.reduce((total, expense) => total + expense.amount, 0)
))

function toDate (timestamp) {
  if (timestamp?.toDate) return timestamp.toDate()
  if (timestamp instanceof Date) return timestamp
  return null
}

function buildManilaDateBoundary (dateValue, endOfDay = false) {
  return new Date(`${dateValue}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+08:00`)
}

function formatCurrency (value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0)
}

function formatDateTime (timestamp) {
  const date = toDate(timestamp)
  if (!date) return 'Date unavailable'
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

async function loadBranches () {
  loadingBranches.value = true
  try {
    const snapshot = await getDocs(collection(db, 'branches'))
    branches.value = snapshot.docs
      .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
      .sort((first, second) => first.name.localeCompare(second.name))

    if (userStore.isStaff) {
      selectedBranch.value = userStore.userData?.branchId || ''
    } else if (!selectedBranch.value && branches.value.length) {
      selectedBranch.value = branches.value[0].id
    }
  } catch (error) {
    console.error('Could not load branches:', error)
    $q.notify({ type: 'negative', message: 'Could not load branches.' })
  } finally {
    loadingBranches.value = false
  }
}

async function loadAccounts () {
  loadingAccounts.value = true
  try {
    const snapshot = await getDocs(collection(db, 'accounts'))
    accounts.value = snapshot.docs
      .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
      .sort((first, second) => first.code.localeCompare(second.code, undefined, { numeric: true }))
  } catch (error) {
    console.error('Could not load accounts:', error)
    $q.notify({ type: 'negative', message: 'Could not load expense accounts.' })
  } finally {
    loadingAccounts.value = false
  }
}

async function loadExpenses () {
  loadingExpenses.value = true
  try {
    const snapshot = await getDocs(collection(db, 'expenses'))
    expenses.value = snapshot.docs
      .map((docSnapshot) => {
        const data = docSnapshot.data()
        return {
          id: docSnapshot.id,
          name: data.name || 'Unnamed expense',
          amount: Number(data.amount) || 0,
          accountId: data.accountId || '',
          notes: data.notes || '',
          branchId: data.branchId || '',
          userId: data.userId || '',
          createdAt: data.createdAt || null
        }
      })
      .sort((first, second) => (toDate(second.createdAt)?.getTime() || 0) - (toDate(first.createdAt)?.getTime() || 0))
  } catch (error) {
    console.error('Could not load expenses:', error)
    $q.notify({ type: 'negative', message: 'Could not load expenses.' })
  } finally {
    loadingExpenses.value = false
  }
}

function openCreateDialog () {
  editingExpenseId.value = null
  editingExpenseCreatedAt.value = null
  editingExpenseUserId.value = ''
  editingExpenseBranchId.value = ''
  expenseForm.value = {
    name: '',
    accountId: expenseAccountOptions.value[0]?.value || '',
    amount: null,
    notes: ''
  }
  createDialog.value = true
}

function openEditDialog (expense) {
  editingExpenseId.value = expense.id
  editingExpenseCreatedAt.value = expense.createdAt
  editingExpenseUserId.value = expense.userId
  editingExpenseBranchId.value = expense.branchId
  expenseForm.value = {
    name: expense.name,
    accountId: expense.accountId || expenseAccountOptions.value[0]?.value || '',
    amount: expense.amount,
    notes: expense.notes
  }
  createDialog.value = true
}

async function saveExpense () {
  const name = expenseForm.value.name
  const amount = Number(expenseForm.value.amount)
  const accountId = expenseForm.value.accountId
  const userId = userStore.user?.uid
  const branchId = selectedBranch.value

  if (!name || !accountId || !Number.isFinite(amount) || amount <= 0 || !userId || !branchId) {
    $q.notify({ type: 'warning', message: 'Please complete the expense details.' })
    return
  }

  savingExpense.value = true
  try {
    const expenseRef = editingExpenseId.value
      ? doc(db, 'expenses', editingExpenseId.value)
      : doc(collection(db, 'expenses'))
    const journalEntryRef = doc(db, 'journalEntries', expenseRef.id)
    if (editingExpenseId.value) {
      const journalSnapshot = await getDoc(journalEntryRef)
      if (journalSnapshot.exists() && journalSnapshot.data().status !== 'draft') {
        $q.notify({ type: 'warning', message: 'This expense cannot be edited because its journal entry is no longer a draft.' })
        return
      }
    }
    const batch = writeBatch(db)
    const transactionDate = editingExpenseCreatedAt.value || serverTimestamp()
    const createdBy = editingExpenseUserId.value || userId
    const journalBranchId = editingExpenseBranchId.value || branchId

    if (editingExpenseId.value) {
      batch.update(expenseRef, {
        name,
        accountId,
        amount,
        notes: expenseForm.value.notes || '',
        journalEntryId: journalEntryRef.id
      })
    } else {
      batch.set(expenseRef, {
        name,
        accountId,
        amount,
        createdAt: serverTimestamp(),
        userId,
        branchId,
        notes: expenseForm.value.notes || '',
        journalEntryId: journalEntryRef.id
      })
    }

    batch.set(journalEntryRef, {
      transactionDate,
      description: `Paid ${name}`,
      referenceType: 'expense',
      referenceId: expenseRef.id,
      totalDebit: amount,
      totalCredit: amount,
      status: 'draft',
      createdAt: transactionDate,
      createdBy,
      branchId: journalBranchId,
      lines: [
        { accountId, debit: amount, credit: 0 },
        { accountId: '1000', debit: 0, credit: amount }
      ]
    }, { merge: true })

    await batch.commit()
    createDialog.value = false
    $q.notify({
      type: 'positive',
      message: editingExpenseId.value ? 'Expense updated.' : 'Expense recorded.'
    })
    await loadExpenses()
  } catch (error) {
    console.error('Could not save expense:', error)
    $q.notify({ type: 'negative', message: 'Could not save expense.' })
  } finally {
    savingExpense.value = false
  }
}

function confirmDelete (expense) {
  $q.dialog({
    title: 'Delete Expense',
    message: `Delete ${expense.name} for ${formatCurrency(expense.amount)}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const journalEntryRef = doc(db, 'journalEntries', expense.id)
      const journalSnapshot = await getDoc(journalEntryRef)
      if (journalSnapshot.exists() && journalSnapshot.data().status !== 'draft') {
        $q.notify({ type: 'warning', message: 'This expense cannot be deleted because its journal entry is no longer a draft.' })
        return
      }
      const batch = writeBatch(db)
      batch.delete(doc(db, 'expenses', expense.id))
      batch.delete(journalEntryRef)
      await batch.commit()
      $q.notify({ type: 'positive', message: 'Expense deleted.' })
      await loadExpenses()
    } catch (error) {
      console.error('Could not delete expense:', error)
      $q.notify({ type: 'negative', message: 'Could not delete expense.' })
    }
  })
}

function clearDateFilters () {
  startDate.value = ''
  endDate.value = ''
}

onMounted(async () => {
  await Promise.all([loadBranches(), loadAccounts(), loadExpenses()])
})
</script>

<style scoped>
.expenses-page {
  color: #4a2038;
  max-width: 1180px;
}

.page-header,
.summary-row {
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
.summary-label,
.dialog-subtitle {
  color: #8a4e71;
}

.filter-panel {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(194, 24, 91, 0.16);
  border-left: 4px solid #c2185b;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(194, 24, 91, 0.08);
}

.summary-row {
  padding: 0 4px;
}

.summary-label {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.summary-amount {
  color: #c2185b;
  font-size: 1.55rem;
  font-weight: 900;
}

.expenses-table {
  border: 1px solid rgba(194, 24, 91, 0.14);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(194, 24, 91, 0.08);
}

.amount-cell {
  color: #c2185b;
  font-weight: 800;
}

.notes-cell {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expense-dialog {
  width: 480px;
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
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>