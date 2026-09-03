<template>
  <q-page class="cash-advances-page q-pa-md">
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Cash Advances</div>
        <div class="page-subtitle">Record and review employee cash advances</div>
      </div>
      <q-btn
        color="pink-7"
        icon="add"
        label="New Cash Advance"
        unelevated
        class="new-advance-btn"
        @click="openCreateDialog"
      />
    </div>

    <section class="filter-panel q-pa-md q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-6 col-md-3">
          <q-select
            v-model="selectedName"
            outlined
            dense
            clearable
            label="Filter by name"
            color="pink-7"
            :options="nameOptions"
            :loading="loadingNames"
          >
            <template v-slot:prepend>
              <q-icon name="person_search" color="pink-7" />
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-select
            v-model="selectedBranch"
            outlined
            dense
            clearable
            emit-value
            map-options
            label="Filter by branch"
            color="pink-7"
            :options="branchOptions"
            :loading="loadingBranches"
          >
            <template v-slot:prepend>
              <q-icon name="store" color="pink-7" />
            </template>
          </q-select>
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-input
            v-model="startDate"
            outlined
            dense
            type="date"
            label="Start Date"
            color="pink-7"
          />
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-input
            v-model="endDate"
            outlined
            dense
            type="date"
            label="End Date"
            color="pink-7"
          />
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-btn
            flat
            icon="filter_alt_off"
            label="Clear"
            color="grey-7"
            class="full-width"
            :disable="!selectedName && !selectedBranch && !startDate && !endDate"
            @click="clearFilters"
          />
        </div>
      </div>
    </section>

    <div class="summary-row q-mb-md">
      <div>
        <div class="summary-label">Filtered total</div>
        <div class="summary-amount">{{ formatCurrency(filteredTotal) }}</div>
      </div>
      <q-btn
        flat
        round
        icon="refresh"
        color="pink-7"  
        :loading="loadingAdvances"
        @click="loadCashAdvances"
      >
        <q-tooltip>Refresh cash advances</q-tooltip>
      </q-btn>
    </div>

    <q-table
      class="advances-table"
      flat
      :rows="filteredCashAdvances"
      :columns="columns"
      row-key="id"
      :loading="loadingAdvances"
      :pagination="{ rowsPerPage: 10 }"
      no-data-label="No cash advances match these filters."
    >
      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <div class="employee-cell">
            <q-avatar size="32px" color="pink-1" text-color="pink-8" icon="person" />
            <span class="text-weight-medium">{{ props.value }}</span>
          </div>
        </q-td>
      </template>
      <template v-slot:body-cell-amount="props">
        <q-td :props="props">
          <span class="amount-cell">{{ formatCurrency(props.value) }}</span>
        </q-td>
      </template>
      <template v-slot:body-cell-createdAt="props">
        <q-td :props="props">
          {{ formatDateTime(props.value) }}
        </q-td>
      </template>
      <template v-slot:body-cell-accountId="props">
        <q-td :props="props">{{ getAccountLabel(props.value) }}</q-td>
      </template>
      <template v-slot:body-cell-branchId="props">
        <q-td :props="props">{{ getBranchLabel(props.value) }}</q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            flat
            round
            dense
            icon="edit"
            color="pink-7"
            :disable="!!props.row.employeeSalaryId"
            @click="openEditDialog(props.row)"
          >
            <q-tooltip>{{ props.row.employeeSalaryId ? 'Delete the linked salary record before editing' : 'Edit cash advance' }}</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            icon="delete"
            color="negative"
            :disable="!!props.row.employeeSalaryId"
            @click="confirmDelete(props.row)"
          >
            <q-tooltip>{{ props.row.employeeSalaryId ? 'Delete the linked salary record before deleting' : 'Delete cash advance' }}</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="createDialog" persistent>
      <q-card class="advance-dialog">
        <q-card-section class="dialog-header row items-center q-col-gutter-md">
          <div class="col-auto">
            <q-avatar color="pink-1" text-color="pink-8" icon="account_balance_wallet" />
          </div>
          <div class="col">
            <div class="dialog-title">{{ editingAdvanceId ? 'Edit Cash Advance' : 'New Cash Advance' }}</div>
            <div class="dialog-subtitle">
              {{ editingAdvanceId ? 'Update the employee and amount' : 'Enter the employee and amount' }}
            </div>
          </div>
        </q-card-section>

        <q-form @submit="saveCashAdvance">
          <q-card-section class="q-gutter-md">
            <q-select
              v-model="cashAdvanceForm.name"
              outlined
              dense
              label="Name"
              color="pink-7"
              :options="nameOptions"
              :loading="loadingNames"
              :rules="[(value) => !!value || 'Name is required']"
            />
            <q-select
              v-model="cashAdvanceForm.branchId"
              outlined
              dense
              emit-value
              map-options
              label="Branch"
              color="pink-7"
              :options="branchOptions"
              :loading="loadingBranches"
              :rules="[(value) => !!value || 'Branch is required']"
            >
              <template v-slot:prepend>
                <q-icon name="store" color="pink-7" />
              </template>
            </q-select>
            <q-select
              v-model="cashAdvanceForm.accountId"
              outlined
              dense
              emit-value
              map-options
              label="Advance Receivable Account"
              color="pink-7"
              :options="advanceAccountOptions"
              :loading="loadingAccounts"
              :rules="[(value) => !!value || 'Advance account is required']"
            >
              <template v-slot:prepend>
                <q-icon name="account_tree" color="pink-7" />
              </template>
            </q-select>
            <q-input
              v-model.number="cashAdvanceForm.amount"
              outlined
              dense
              type="number"
              min="0.01"
              step="0.01"
              prefix="₱"
              label="Amount"
              color="pink-7"
              autofocus
              :rules="[(value) => Number.isFinite(Number(value)) && Number(value) > 0 || 'Amount must be greater than 0']"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="Cancel" color="grey-7" :disable="savingAdvance" v-close-popup />
            <q-btn
              unelevated
              type="submit"
              icon="save"
              :label="editingAdvanceId ? 'Update' : 'Submit'"
              color="pink-7"
              :loading="savingAdvance"
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
const cashAdvances = ref([])
const attendanceNames = ref([])
const accounts = ref([])
const branches = ref([])
const loadingAdvances = ref(false)
const loadingNames = ref(false)
const loadingAccounts = ref(false)
const loadingBranches = ref(false)
const savingAdvance = ref(false)
const createDialog = ref(false)
const editingAdvanceId = ref(null)
const selectedName = ref(null)
const selectedBranch = ref(null)
const startDate = ref('')
const endDate = ref('')
const cashAdvanceForm = ref({
  name: null,
  branchId: '',
  accountId: '',
  amount: null
})

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right', sortable: true },
  { name: 'branchId', label: 'Branch', field: 'branchId', align: 'left', sortable: true },
  { name: 'accountId', label: 'Advance Account', field: 'accountId', align: 'left' },
  { name: 'createdAt', label: 'Date & Time', field: 'createdAt', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const nameOptions = computed(() => {
  const names = [
    ...attendanceNames.value,
    ...cashAdvances.value.map((advance) => advance.name)
  ].filter(Boolean)
  return [...new Set(names)].sort((first, second) => first.localeCompare(second))
})

const advanceAccountOptions = computed(() => accounts.value
  .filter((account) => account.type === 'asset' && account.id !== '1000' && account.isActive !== false)
  .map((account) => ({ label: `${account.code} - ${account.name}`, value: account.id })))

const branchOptions = computed(() => branches.value.map((branch) => ({
  label: branch.name,
  value: branch.id
})))

const filteredCashAdvances = computed(() => {
  const start = startDate.value ? buildManilaDateBoundary(startDate.value) : null
  const end = endDate.value ? buildManilaDateBoundary(endDate.value, true) : null

  return cashAdvances.value.filter((advance) => {
    if (selectedName.value && advance.name !== selectedName.value) return false
    if (selectedBranch.value && advance.branchId !== selectedBranch.value) return false
    const createdAt = toDate(advance.createdAt)
    if (start && (!createdAt || createdAt < start)) return false
    if (end && (!createdAt || createdAt > end)) return false
    return true
  })
})

const filteredTotal = computed(() => (
  filteredCashAdvances.value.reduce((sum, advance) => sum + advance.amount, 0)
))

function toDate (timestamp) {
  if (timestamp?.toDate) return timestamp.toDate()
  if (timestamp instanceof Date) return timestamp
  return null
}

function buildManilaDateBoundary (dateValue, endOfDay = false) {
  const time = endOfDay ? '23:59:59.999' : '00:00:00.000'
  return new Date(`${dateValue}T${time}+08:00`)
}

function formatCurrency (value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value) || 0)
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

function getAccountLabel (accountId) {
  if (!accountId) return '—'
  const account = accounts.value.find((item) => item.id === accountId)
  return account ? `${account.code} - ${account.name}` : accountId
}

function getBranchLabel (branchId) {
  if (!branchId) return 'Unassigned'
  return branches.value.find((branch) => branch.id === branchId)?.name || branchId
}

async function loadNames () {
  loadingNames.value = true
  try {
    const snapshot = await getDocs(collection(db, 'attendance'))
    attendanceNames.value = snapshot.docs
      .map((docSnapshot) => docSnapshot.data().name)
      .filter(Boolean)
  } catch (error) {
    console.error('Could not load employee names:', error)
    $q.notify({ type: 'negative', message: 'Could not load employee names.' })
  } finally {
    loadingNames.value = false
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
    $q.notify({ type: 'negative', message: 'Could not load cash advance accounts.' })
  } finally {
    loadingAccounts.value = false
  }
}

async function loadBranches () {
  loadingBranches.value = true
  try {
    const snapshot = await getDocs(collection(db, 'branches'))
    branches.value = snapshot.docs
      .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
      .sort((first, second) => first.name.localeCompare(second.name))
  } catch (error) {
    console.error('Could not load branches:', error)
    $q.notify({ type: 'negative', message: 'Could not load branches.' })
  } finally {
    loadingBranches.value = false
  }
}

async function loadCashAdvances () {
  loadingAdvances.value = true
  try {
    const snapshot = await getDocs(collection(db, 'cashAdvances'))
    cashAdvances.value = snapshot.docs
      .map((docSnapshot) => ({
        id: docSnapshot.id,
        name: docSnapshot.data().name || 'Unknown',
        amount: Number(docSnapshot.data().amount) || 0,
        branchId: docSnapshot.data().branchId || '',
        accountId: docSnapshot.data().accountId || '',
        journalEntryId: docSnapshot.data().journalEntryId || '',
        employeeSalaryId: docSnapshot.data().employeeSalaryId || '',
        createdBy: docSnapshot.data().createdBy || '',
        createdAt: docSnapshot.data().createdAt || null
      }))
      .sort((first, second) => {
        const firstTime = toDate(first.createdAt)?.getTime() || 0
        const secondTime = toDate(second.createdAt)?.getTime() || 0
        return secondTime - firstTime
      })
  } catch (error) {
    console.error('Could not load cash advances:', error)
    $q.notify({ type: 'negative', message: 'Could not load cash advances.' })
  } finally {
    loadingAdvances.value = false
  }
}

function openCreateDialog () {
  editingAdvanceId.value = null
  cashAdvanceForm.value = {
    name: selectedName.value || null,
    branchId: selectedBranch.value || branchOptions.value[0]?.value || '',
    accountId: advanceAccountOptions.value.find((option) => option.value === '1200')?.value || advanceAccountOptions.value[0]?.value || '',
    amount: null
  }
  createDialog.value = true
}

function openEditDialog (cashAdvance) {
  if (cashAdvance.employeeSalaryId) {
    $q.notify({ type: 'warning', message: 'Delete the linked salary record before editing this cash advance.' })
    return
  }
  editingAdvanceId.value = cashAdvance.id
  cashAdvanceForm.value = {
    name: cashAdvance.name,
    branchId: cashAdvance.branchId || selectedBranch.value || branchOptions.value[0]?.value || '',
    accountId: cashAdvance.accountId || advanceAccountOptions.value.find((option) => option.value === '1200')?.value || advanceAccountOptions.value[0]?.value || '',
    amount: cashAdvance.amount
  }
  createDialog.value = true
}

async function saveCashAdvance () {
  const name = cashAdvanceForm.value.name
  const amount = Number(cashAdvanceForm.value.amount)
  const branchId = cashAdvanceForm.value.branchId
  const accountId = cashAdvanceForm.value.accountId
  const branch = branches.value.find((item) => item.id === branchId)
  const advanceAccount = accounts.value.find((account) => account.id === accountId)
  const cashAccount = accounts.value.find((account) => account.id === '1000')
  if (
    !name || !branch || !Number.isFinite(amount) || amount <= 0 ||
    !advanceAccount || advanceAccount.type !== 'asset' || advanceAccount.isActive === false ||
    !cashAccount || cashAccount.type !== 'asset' || cashAccount.isActive === false
  ) {
    $q.notify({ type: 'warning', message: 'Please enter valid cash advance details.' })
    return
  }

  savingAdvance.value = true
  try {
    const existingAdvance = editingAdvanceId.value
      ? cashAdvances.value.find((advance) => advance.id === editingAdvanceId.value)
      : null
    const advanceRef = editingAdvanceId.value
      ? doc(db, 'cashAdvances', editingAdvanceId.value)
      : doc(collection(db, 'cashAdvances'))
    const journalEntryId = existingAdvance?.journalEntryId || `cash-advance-${advanceRef.id}`
    const journalEntryRef = doc(db, 'journalEntries', journalEntryId)
    if (editingAdvanceId.value) {
      const journalSnapshot = await getDoc(journalEntryRef)
      if (journalSnapshot.exists() && journalSnapshot.data().status !== 'draft') {
        $q.notify({ type: 'warning', message: 'This cash advance cannot be edited because its journal entry is no longer a draft.' })
        return
      }
    }
    const createdBy = existingAdvance?.createdBy || userStore.user?.uid || ''
    const transactionDate = existingAdvance?.createdAt || serverTimestamp()
    const batch = writeBatch(db)

    if (editingAdvanceId.value) {
      batch.update(advanceRef, {
        name,
        branchId,
        accountId,
        amount,
        journalEntryId,
        updatedAt: serverTimestamp()
      })
    } else {
      batch.set(advanceRef, {
        name,
        branchId,
        accountId,
        amount,
        journalEntryId,
        createdBy,
        createdAt: transactionDate,
        updatedAt: serverTimestamp()
      })
    }

    const journalEntryData = {
      description: `Cash advance for ${name}`,
      referenceType: 'cashAdvance',
      referenceId: advanceRef.id,
      totalDebit: amount,
      totalCredit: amount,
      status: 'draft',
      branchId,
      updatedAt: serverTimestamp(),
      lines: [
        { accountId, debit: amount, credit: 0 },
        { accountId: '1000', debit: 0, credit: amount }
      ]
    }
    if (!existingAdvance?.journalEntryId) {
      journalEntryData.transactionDate = transactionDate
      journalEntryData.createdAt = transactionDate
      journalEntryData.createdBy = createdBy
    }
    batch.set(journalEntryRef, journalEntryData, { merge: true })
    await batch.commit()

    createDialog.value = false
    $q.notify({
      type: 'positive',
      message: editingAdvanceId.value ? 'Cash advance updated.' : 'Cash advance recorded.'
    })
    await loadCashAdvances()
  } catch (error) {
    console.error('Could not save cash advance:', error)
    $q.notify({ type: 'negative', message: 'Could not save cash advance.' })
  } finally {
    savingAdvance.value = false
  }
}

function confirmDelete (cashAdvance) {
  if (cashAdvance.employeeSalaryId) {
    $q.notify({ type: 'warning', message: 'Delete the linked salary record before deleting this cash advance.' })
    return
  }
  $q.dialog({
    title: 'Delete Cash Advance',
    message: `Delete ${formatCurrency(cashAdvance.amount)} for ${cashAdvance.name}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const journalEntryRef = doc(db, 'journalEntries', cashAdvance.journalEntryId || `cash-advance-${cashAdvance.id}`)
      const journalSnapshot = await getDoc(journalEntryRef)
      if (journalSnapshot.exists() && journalSnapshot.data().status !== 'draft') {
        $q.notify({ type: 'warning', message: 'This cash advance cannot be deleted because its journal entry is no longer a draft.' })
        return
      }
      const batch = writeBatch(db)
      batch.delete(doc(db, 'cashAdvances', cashAdvance.id))
      batch.delete(journalEntryRef)
      await batch.commit()
      $q.notify({ type: 'positive', message: 'Cash advance deleted.' })
      await loadCashAdvances()
    } catch (error) {
      console.error('Could not delete cash advance:', error)
      $q.notify({ type: 'negative', message: 'Could not delete cash advance.' })
    }
  })
}

function clearFilters () {
  selectedName.value = null
  selectedBranch.value = null
  startDate.value = ''
  endDate.value = ''
}

onMounted(() => {
  loadNames()
  loadAccounts()
  loadBranches()
  loadCashAdvances()
})
</script>

<style scoped>
.cash-advances-page {
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
  color: #4a2038;
  font-size: 2rem;
  font-weight: 900;
  line-height: 1.15;
}

.page-subtitle,
.summary-label,
.dialog-subtitle {
  color: #8a4e71;
}

.new-advance-btn {
  min-height: 42px;
  padding: 0 18px;
}

.filter-panel {
  background: rgba(255, 255, 255, 0.82);
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

.advances-table {
  border: 1px solid rgba(194, 24, 91, 0.14);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(194, 24, 91, 0.08);
}

.employee-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.amount-cell {
  color: #c2185b;
  font-weight: 800;
}

.advance-dialog {
  width: 420px;
  max-width: 92vw;
  border-top: 4px solid #c2185b;
  border-radius: 8px;
}

.dialog-header {
  border-bottom: 1px solid rgba(194, 24, 91, 0.14);
}

.dialog-title {
  color: #4a2038;
  font-size: 1.15rem;
  font-weight: 800;
}

.dialog-subtitle {
  font-size: 0.875rem;
}

@media (max-width: 599px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .new-advance-btn {
    width: 100%;
  }
}
</style>
