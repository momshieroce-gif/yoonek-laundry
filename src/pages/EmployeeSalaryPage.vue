<template>
  <q-page class="employee-salary-page q-pa-md">
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Employee Salary</div>
        <div class="page-subtitle">Review recorded payroll and employee deductions</div>
      </div>
      <q-btn flat round icon="refresh" color="pink-7" :loading="loadingSalaries" @click="loadSalaries">
        <q-tooltip>Refresh employee salaries</q-tooltip>
      </q-btn>
    </div>

    <section class="filter-panel q-pa-md q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-4">
          <q-select
            v-model="selectedName"
            outlined
            dense
            clearable
            label="Filter by name"
            color="pink-7"
            :options="nameOptions"
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input v-model="startDate" outlined dense type="date" label="Period Start" color="pink-7" />
        </div>
        <div class="col-12 col-sm-3">
          <q-input v-model="endDate" outlined dense type="date" label="Period End" color="pink-7" />
        </div>
        <div class="col-12 col-sm-2">
          <q-btn
            flat
            icon="filter_alt_off"
            label="Clear"
            color="grey-7"
            class="full-width"
            :disable="!selectedName && !startDate && !endDate"
            @click="clearFilters"
          />
        </div>
      </div>
    </section>

    <div class="summary-row q-mb-md">
      <div>
        <div class="summary-label">Filtered net pay</div>
        <div class="summary-amount">{{ formatCurrency(filteredNetTotal) }}</div>
      </div>
    </div>

    <q-table
      class="salary-table"
      flat
      row-key="id"
      :rows="filteredSalaries"
      :columns="columns"
      :loading="loadingSalaries"
      :pagination="{ rowsPerPage: 10 }"
      no-data-label="No employee salaries match these filters."
    >
      <template v-slot:body-cell-period="props">
        <q-td :props="props">{{ formatPeriod(props.row) }}</q-td>
      </template>
      <template v-slot:body-cell-grossTotal="props">
        <q-td :props="props">{{ formatCurrency(props.value) }}</q-td>
      </template>
      <template v-slot:body-cell-cashAdvanceTotal="props">
        <q-td :props="props">{{ formatCurrency(props.value) }}</q-td>
      </template>
      <template v-slot:body-cell-netTotal="props">
        <q-td :props="props"><span class="net-amount">{{ formatCurrency(props.value) }}</span></q-td>
      </template>
      <template v-slot:body-cell-createdAt="props">
        <q-td :props="props">{{ formatDateTime(props.value) }}</q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)">
            <q-tooltip>Delete salary record</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { db, collection, doc, getDoc, getDocs, query, where, writeBatch } from '../boot/firebase'

const $q = useQuasar()
const salaries = ref([])
const loadingSalaries = ref(false)
const selectedName = ref(null)
const startDate = ref('')
const endDate = ref('')

const columns = [
  { name: 'name', label: 'Employee', field: 'name', align: 'left', sortable: true },
  { name: 'period', label: 'Pay Period', field: 'period', align: 'left' },
  { name: 'noOfHours', label: 'Hours', field: 'noOfHours', align: 'right' },
  { name: 'grossTotal', label: 'Gross Salary', field: 'grossTotal', align: 'right' },
  { name: 'cashAdvanceTotal', label: 'Cash Advances', field: 'cashAdvanceTotal', align: 'right' },
  { name: 'netTotal', label: 'Net Pay', field: 'netTotal', align: 'right' },
  { name: 'createdAt', label: 'Recorded', field: 'createdAt', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const nameOptions = computed(() => [...new Set(salaries.value.map((salary) => salary.name))].sort())

const filteredSalaries = computed(() => salaries.value.filter((salary) => {
  if (selectedName.value && salary.name !== selectedName.value) return false
  const periodStart = toDate(salary.startDate)
  const periodEnd = toDate(salary.endDate)
  const filterStart = startDate.value ? buildManilaDateBoundary(startDate.value) : null
  const filterEnd = endDate.value ? buildManilaDateBoundary(endDate.value, true) : null
  if (filterStart && (!periodEnd || periodEnd < filterStart)) return false
  if (filterEnd && (!periodStart || periodStart > filterEnd)) return false
  return true
}))

const filteredNetTotal = computed(() => filteredSalaries.value.reduce((sum, salary) => sum + salary.netTotal, 0))

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

function formatDate (timestamp) {
  const date = toDate(timestamp)
  return date ? date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }) : 'Date unavailable'
}

function formatDateTime (timestamp) {
  const date = toDate(timestamp)
  return date ? date.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable'
}

function formatPeriod (salary) {
  return `${formatDate(salary.startDate)} - ${formatDate(salary.endDate)}`
}

async function loadSalaries () {
  loadingSalaries.value = true
  try {
    const snapshot = await getDocs(collection(db, 'employeeSalaries'))
    salaries.value = snapshot.docs
      .map((docSnapshot) => {
        const data = docSnapshot.data()
        return {
          id: docSnapshot.id,
          name: data.name || 'Unknown employee',
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          noOfHours: Number(data.noOfHours) || 0,
          grossTotal: Number(data.grossTotal) || 0,
          cashAdvanceTotal: Number(data.cashAdvanceTotal) || 0,
          netTotal: Number(data.netTotal) || 0,
          journalEntryId: data.journalEntryId || `employee-salary-${docSnapshot.id}`,
          createdAt: data.createdAt || null
        }
      })
      .sort((first, second) => (toDate(second.createdAt)?.getTime() || 0) - (toDate(first.createdAt)?.getTime() || 0))
  } catch (error) {
    console.error('Could not load employee salaries:', error)
    $q.notify({ type: 'negative', message: 'Could not load employee salaries.' })
  } finally {
    loadingSalaries.value = false
  }
}

function confirmDelete (salary) {
  $q.dialog({
    title: 'Delete Employee Salary',
    message: `Delete ${salary.name}'s salary record for ${formatCurrency(salary.netTotal)}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const journalEntryRef = doc(db, 'journalEntries', salary.journalEntryId)
      const journalSnapshot = await getDoc(journalEntryRef)
      if (journalSnapshot.exists() && journalSnapshot.data().status !== 'draft') {
        $q.notify({ type: 'warning', message: 'This salary cannot be deleted because its journal entry is no longer a draft.' })
        return
      }
      const linkedAdvances = await getDocs(query(
        collection(db, 'cashAdvances'),
        where('employeeSalaryId', '==', salary.id)
      ))
      const batch = writeBatch(db)
      batch.delete(doc(db, 'employeeSalaries', salary.id))
      batch.delete(journalEntryRef)
      linkedAdvances.docs.forEach((advanceSnapshot) => {
        batch.update(advanceSnapshot.ref, { employeeSalaryId: null, settledAt: null })
      })
      await batch.commit()
      $q.notify({ type: 'positive', message: 'Employee salary and journal entry deleted.' })
      await loadSalaries()
    } catch (error) {
      console.error('Could not delete employee salary:', error)
      $q.notify({ type: 'negative', message: 'Could not delete employee salary.' })
    }
  })
}

function clearFilters () {
  selectedName.value = null
  startDate.value = ''
  endDate.value = ''
}

onMounted(loadSalaries)
</script>

<style scoped>
.employee-salary-page {
  color: #4a2038;
  max-width: 1280px;
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
.summary-label {
  color: #8a4e71;
}

.filter-panel {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(194, 24, 91, 0.16);
  border-left: 4px solid #c2185b;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(194, 24, 91, 0.08);
}

.summary-amount,
.net-amount {
  color: #c2185b;
  font-weight: 800;
}

.summary-amount {
  font-size: 1.5rem;
}

.salary-table {
  border: 1px solid rgba(194, 24, 91, 0.12);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(194, 24, 91, 0.08);
}
</style>