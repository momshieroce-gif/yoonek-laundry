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
        <div class="summary-label">Filtered grand total</div>
        <div class="summary-amount">{{ formatCurrency(filteredGrandTotal) }}</div>
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
      <template v-slot:body-cell-grandTotal="props">
        <q-td :props="props"><span class="net-amount">{{ formatCurrency(props.value) }}</span></q-td>
      </template>
      <template v-slot:body-cell-createdAt="props">
        <q-td :props="props">{{ formatDateTime(props.value) }}</q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat round dense icon="print" color="pink-7" @click="printSalary(props.row)">
            <q-tooltip>Print payslip</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="edit" color="pink-7" @click="openEdit(props.row)">
            <q-tooltip>Edit salary record</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)">
            <q-tooltip>Delete salary record</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="editDialog" persistent>
      <q-card style="min-width: 360px; max-width: 96vw; width: 900px;">
        <q-card-section>
          <div class="page-subtitle">Edit Employee Salary</div>
        </q-card-section>

        <q-form @submit="submitEdit">
          <q-card-section class="q-gutter-md">
            <q-input v-model="editForm.name" outlined dense label="Name" color="pink-7" :rules="[(val) => !!val || 'Name is required']" />
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input v-model="editForm.startDate" outlined dense type="date" label="Start Date" color="pink-7" :rules="[(val) => !!val || 'Start date is required']" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="editForm.endDate" outlined dense type="date" label="End Date" color="pink-7" :rules="[(val) => !!val || 'End date is required']" />
              </div>
            </div>
          </q-card-section>

          <q-card-section v-if="editForm.rows.length" class="q-pt-none">
            <div class="page-subtitle q-mb-sm">Attendance Rows</div>
            <div v-for="(row, index) in editForm.rows" :key="index" class="row q-col-gutter-sm items-center q-mb-sm row-edit-item">
              <div class="col-12 col-sm-3">
                <q-input v-model="row.createdAt" outlined dense type="datetime-local" label="Date & Time" color="pink-7" />
              </div>
              <div class="col-6 col-sm-1">
                <q-input v-model.number="row.noOfHours" outlined dense type="number" step="0.01" label="Hours" color="pink-7" />
              </div>
              <div class="col-6 col-sm-1">
                <q-input v-model.number="row.ratePerDay" outlined dense type="number" step="0.01" label="Rate/Day" color="pink-7" />
              </div>
              <div class="col-6 col-sm-2">
                <q-input v-model.number="row.regularHours" outlined dense type="number" step="0.01" label="Reg. Hours" color="pink-7" />
              </div>
              <div class="col-6 col-sm-2">
                <q-input v-model.number="row.regularPay" outlined dense type="number" step="0.01" label="Regular Pay" color="pink-7" />
              </div>
              <div class="col-6 col-sm-1">
                <q-input v-model.number="row.overtimeHours" outlined dense type="number" step="0.01" label="OT Hours" color="pink-7" />
              </div>
              <div class="col-6 col-sm-1">
                <q-input v-model.number="row.overtimePay" outlined dense type="number" step="0.01" label="OT Pay" color="pink-7" />
              </div>
              <div class="col-10 col-sm-1">
                <q-input v-model.number="row.total" outlined dense type="number" step="0.01" label="Total" color="pink-7" />
              </div>
              <div class="col-2 col-sm-auto">
                <q-btn flat round dense icon="delete" color="negative" @click="removeEditRow(index)">
                  <q-tooltip>Remove row</q-tooltip>
                </q-btn>
              </div>
            </div>
          </q-card-section>

          <q-card-section class="q-gutter-md">
            <q-input v-model.number="editForm.cashAdvanceTotal" outlined dense type="number" step="0.01" label="Cash Advance Total" color="pink-7" />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="grey-7" v-close-popup />
            <q-btn unelevated type="submit" label="Save" color="pink-7" :loading="savingEdit" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { db, collection, doc, getDocs, query, where, updateDoc, writeBatch } from '../boot/firebase'

const $q = useQuasar()
const salaries = ref([])
const loadingSalaries = ref(false)
const selectedName = ref(null)
const startDate = ref('')
const endDate = ref('')
const editDialog = ref(false)
const savingEdit = ref(false)
const editingId = ref(null)
const editForm = ref({
  name: '',
  startDate: '',
  endDate: '',
  cashAdvanceTotal: 0,
  rows: []
})

const columns = [
  { name: 'name', label: 'Employee', field: 'name', align: 'left', sortable: true },
  { name: 'period', label: 'Pay Period', field: 'period', align: 'left' },
  { name: 'noOfHours', label: 'Hours', field: 'noOfHours', align: 'right' },
  { name: 'grossTotal', label: 'Gross Salary', field: 'grossTotal', align: 'right' },
  { name: 'cashAdvanceTotal', label: 'Cash Advances', field: 'cashAdvanceTotal', align: 'right' },
  { name: 'grandTotal', label: 'Grand Total', field: 'grandTotal', align: 'right' },
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

const filteredGrandTotal = computed(() => filteredSalaries.value.reduce((sum, salary) => sum + salary.grandTotal, 0))

function toDate (timestamp) {
  if (timestamp?.toDate) return timestamp.toDate()
  if (timestamp instanceof Date) return timestamp
  return null
}

function buildManilaDateBoundary (dateValue, endOfDay = false) {
  return new Date(`${dateValue}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+08:00`)
}

function formatDateInput (timestamp) {
  const date = toDate(timestamp)
  if (!date) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`
}

function formatRowDateTimeInput (timestamp) {
  const date = toDate(timestamp)
  if (!date) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}`
}

function buildRowDateTime (dateTimeValue) {
  return new Date(`${dateTimeValue}:00+08:00`)
}

function formatCurrency (value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0)
}

function formatNumber (value) {
  return Number(value || 0).toFixed(2)
}

function escapeHtml (value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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
          ratePerDay: Number(data.ratePerDay) || 0,
          ratePerHourOvertime: Number(data.ratePerHourOvertime) || 0,
          regularPayTotal: Number(data.regularPayTotal) || 0,
          overtimePayTotal: Number(data.overtimePayTotal) || 0,
          grossTotal: Number(data.grossTotal) || 0,
          cashAdvanceTotal: Number(data.cashAdvanceTotal) || 0,
          grandTotal: Number(data.grandTotal) || 0,
          rows: Array.isArray(data.rows) ? data.rows : [],
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
    message: `Delete ${salary.name}'s salary record for ${formatCurrency(salary.grandTotal)}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const linkedAdvances = await getDocs(query(
        collection(db, 'cashAdvances'),
        where('employeeSalaryId', '==', salary.id)
      ))
      const batch = writeBatch(db)
      batch.delete(doc(db, 'employeeSalaries', salary.id))
      linkedAdvances.docs.forEach((advanceSnapshot) => {
        batch.update(advanceSnapshot.ref, { employeeSalaryId: null, settledAt: null })
      })
      await batch.commit()
      $q.notify({ type: 'positive', message: 'Employee salary deleted.' })
      await loadSalaries()
    } catch (error) {
      console.error('Could not delete employee salary:', error)
      $q.notify({ type: 'negative', message: 'Could not delete employee salary.' })
    }
  })
}

function printSalary (salary) {
  const rows = [...salary.rows].sort((first, second) => (toDate(first.createdAt)?.getTime() || 0) - (toDate(second.createdAt)?.getTime() || 0))
  const tableRows = rows.map((row) => {
    const createdAt = toDate(row.createdAt)
    return `
      <tr>
        <td>${escapeHtml(createdAt ? createdAt.toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          dateStyle: 'medium',
          timeStyle: 'short'
        }) : 'Date unavailable')}</td>
        <td class="number">${formatNumber(row.noOfHours)}</td>
        <td class="number">${formatNumber(row.ratePerDay)}</td>
        <td class="number">${formatNumber(row.regularHours)} hours = ${formatNumber(row.regularPay)}</td>
        <td class="number">${formatNumber(row.overtimeHours)} × ${formatNumber(row.ratePerHourOvertime)} = ${formatNumber(row.overtimePay)}</td>
        <td class="number">${formatNumber(row.total)}</td>
      </tr>
    `
  }).join('')
  const cashAdvanceDisplay = salary.cashAdvanceTotal > 0 ? formatNumber(salary.cashAdvanceTotal) : 'N/A'
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payslip - ${escapeHtml(salary.name)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          .meta { margin-bottom: 20px; color: #555; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f6f6f6; }
          .number { text-align: right; }
          .cash-advance { margin-top: 16px; text-align: right; color: #555; }
          .grand-total { margin-top: 16px; text-align: right; font-size: 18px; font-weight: 700; }
        </style>
      </head>
      <body onload="window.print()">
        <h1>Payslip</h1>
        <div class="meta">
          <div>Name: ${escapeHtml(salary.name)}</div>
          <div>Start Date: ${escapeHtml(formatDateInput(salary.startDate))}</div>
          <div>End Date: ${escapeHtml(formatDateInput(salary.endDate))}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>No. of Hours</th>
              <th>Rate Per Day</th>
              <th>Regular Pay</th>
              <th>Overtime Pay</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="cash-advance">Cash Advance: ${cashAdvanceDisplay}</div>
        <div class="grand-total">Grand Total: ${formatNumber(salary.grandTotal)}</div>
      </body>
    </html>
  `
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
  }
}

function openEdit (salary) {
  editingId.value = salary.id
  editForm.value = {
    name: salary.name,
    startDate: formatDateInput(salary.startDate),
    endDate: formatDateInput(salary.endDate),
    cashAdvanceTotal: salary.cashAdvanceTotal,
    rows: salary.rows.map((row) => ({
      attendanceId: row.attendanceId || null,
      createdAt: formatRowDateTimeInput(row.createdAt),
      noOfHours: Number(row.noOfHours) || 0,
      ratePerDay: Number(row.ratePerDay) || 0,
      ratePerHourOvertime: Number(row.ratePerHourOvertime) || 0,
      regularHours: Number(row.regularHours) || 0,
      regularPay: Number(row.regularPay) || 0,
      overtimeHours: Number(row.overtimeHours) || 0,
      overtimePay: Number(row.overtimePay) || 0,
      total: Number(row.total) || 0
    }))
  }
  editDialog.value = true
}

function removeEditRow (index) {
  editForm.value.rows.splice(index, 1)
}

async function submitEdit () {
  if (!editingId.value) return

  savingEdit.value = true
  try {
    const rows = editForm.value.rows.map((row) => ({
      attendanceId: row.attendanceId || null,
      createdAt: buildRowDateTime(row.createdAt),
      noOfHours: Number(row.noOfHours) || 0,
      ratePerDay: Number(row.ratePerDay) || 0,
      ratePerHourOvertime: Number(row.ratePerHourOvertime) || 0,
      regularHours: Number(row.regularHours) || 0,
      regularPay: Number(row.regularPay) || 0,
      overtimeHours: Number(row.overtimeHours) || 0,
      overtimePay: Number(row.overtimePay) || 0,
      total: Number(row.total) || 0
    }))
    const noOfHours = rows.reduce((sum, row) => sum + row.noOfHours, 0)
    const regularPayTotal = rows.reduce((sum, row) => sum + row.regularPay, 0)
    const overtimePayTotal = rows.reduce((sum, row) => sum + row.overtimePay, 0)
    const grossTotal = rows.reduce((sum, row) => sum + row.total, 0)
    const cashAdvanceTotal = Number(editForm.value.cashAdvanceTotal) || 0
    const grandTotal = grossTotal - cashAdvanceTotal

    await updateDoc(doc(db, 'employeeSalaries', editingId.value), {
      name: editForm.value.name,
      startDate: buildManilaDateBoundary(editForm.value.startDate),
      endDate: buildManilaDateBoundary(editForm.value.endDate, true),
      noOfHours,
      ratePerDay: rows[0]?.ratePerDay || 0,
      ratePerHourOvertime: rows[0]?.ratePerHourOvertime || 0,
      regularPayTotal,
      overtimePayTotal,
      grossTotal,
      cashAdvanceTotal,
      grandTotal,
      rows
    })
    $q.notify({ type: 'positive', message: 'Employee salary updated.' })
    editDialog.value = false
    await loadSalaries()
  } catch (error) {
    console.error('Could not update employee salary:', error)
    $q.notify({ type: 'negative', message: 'Could not update employee salary.' })
  } finally {
    savingEdit.value = false
  }
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

.row-edit-item {
  border-bottom: 1px solid rgba(194, 24, 91, 0.12);
  padding-bottom: 8px;
}
</style>