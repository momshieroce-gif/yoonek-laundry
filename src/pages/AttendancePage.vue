<template>
  <q-page class="attendance-page q-pa-md">

    <q-card class="verification-card q-mt-lg">
      <q-card-section class="q-pa-lg">
        <div class="row items-center q-col-gutter-lg">
          <div class="col-auto">
            <q-icon name="app_registration" size="3rem" class="verification-icon" />
          </div>
          <div class="col">
            <div class="verification-title">Fingerprint enrollment</div>
            <div class="verification-status" :class="enrollRunning ? 'is-running' : ''">
              {{ enrollStatusMessage }}
            </div>
          </div>
        </div>
        <div class="row items-center q-col-gutter-md q-mt-md">
          <div class="col-12 col-sm-auto">
            <q-btn
              flat
              color="pink-7"
              icon="refresh"
              class="q-mr-sm"
              :loading="refreshingEnroll"
              :disable="!isElectron"
              @click="refreshEnrollStatus"
            >
              <q-tooltip>Refresh enrollment status</q-tooltip>
            </q-btn>
            <q-btn
              color="pink-7"
              icon="app_registration"
              label="Enroll Fingerprint"
              unelevated
              :loading="enrolling"
              :disable="enrollRunning || !isElectron"
              @click="startEnrollment"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="verification-card attendance-table-card q-mt-lg">
      <q-card-section class="q-pa-lg">
        <div class="row items-center justify-between q-mb-md">
          <div class="verification-title">Attendance Logs</div>
          <q-btn
            flat
            dense
            round
            icon="refresh"
            color="pink-7"
            :loading="loadingAttendance"
            @click="reloadAttendance"
          >
            <q-tooltip>Refresh attendance logs</q-tooltip>
          </q-btn>
        </div>

        <div v-if="userStore.isAdmin" class="row items-end q-col-gutter-md q-mb-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="selectedAttendanceName"
              outlined
              dense
              clearable
              label="Filter by name"
              color="pink-7"
              :options="attendanceNameOptions"
              :loading="loadingAttendanceNames"
              @update:model-value="reloadAttendance"
            />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-input
              v-model="invoiceStartDate"
              outlined
              dense
              type="date"
              label="Start Date"
              color="pink-7"
            />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-input
              v-model="invoiceEndDate"
              outlined
              dense
              type="date"
              label="End Date"
              color="pink-7"
            />
          </div>
          <div class="col-12 col-sm-auto">
            <q-btn
              color="pink-7"
              icon="payments"
              label="Create Rate"
              unelevated
              :loading="creatingRate"
              :disable="!selectedAttendanceName"
              @click="createRate"
            />
          </div>
          <div class="col-12 col-sm-auto">
            <q-btn
              color="pink-7"
              icon="print"
              label="Print Payslip"
              outline
              :loading="printingPaySlip"
              :disable="!invoiceStartDate || !invoiceEndDate"
              @click="printPaySlip"
            />
          </div>
          <div class="col-12 col-sm-auto">
            <q-btn
              color="pink-7"
              icon="post_add"
              label="Record Employee Salary"
              unelevated
              :loading="recordingEmployeeSalary"
              :disable="!selectedAttendanceName || !invoiceStartDate || !invoiceEndDate"
              @click="recordEmployeeSalary"
            />
          </div>
        </div>

        <q-table
          flat
          :rows="attendanceRows"
          :columns="attendanceColumns"
          row-key="id"
          :loading="loadingAttendance"
          hide-bottom
          :pagination="{ rowsPerPage: 0 }"
          no-data-label="No attendance logs yet."
        >
          <template v-slot:body-cell-logType="props">
            <q-td :props="props">
              <q-chip
                square
                dense
                text-color="white"
                :color="props.value === 'In' ? 'positive' : 'negative'"
              >
                {{ props.value }}
              </q-chip>
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
               v-if="userStore.isAdmin"
                flat
                round
                dense
                icon="edit"
                color="pink-7"
                @click="openEditAttendance(props.row)"
              >
                <q-tooltip>Edit attendance log</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="deleteAttendance(props.row)"
              >
                <q-tooltip>Delete attendance log</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <div class="row items-center justify-end q-mt-md q-gutter-sm">
          <q-btn
            flat
            dense
            icon="chevron_left"
            label="Prev"
            color="pink-7"
            :disable="currentAttendancePage === 0 || loadingAttendance"
            @click="loadPreviousAttendancePage"
          />
          <q-btn
            flat
            dense
            icon-right="chevron_right"
            label="Next"
            color="pink-7"
            :disable="!hasNextAttendancePage || loadingAttendance"
            @click="loadNextAttendancePage"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="editAttendanceDialog" persistent>
      <q-card style="min-width: 360px; max-width: 92vw;">
        <q-card-section>
          <div class="verification-title">Edit Attendance</div>
        </q-card-section>

        <q-form @submit="submitAttendanceEdit">
          <q-card-section class="q-gutter-md">
            <q-select
              v-model="editAttendanceForm.logType"
              outlined
              dense
              label="Log Type"
              color="pink-7"
              :options="logTypeOptions"
              :rules="[(val) => !!val || 'Log type is required']"
            />
            <q-input
              v-model.number="editAttendanceForm.noOfHours"
              outlined
              dense
              type="number"
              min="0"
              step="0.01"
              label="No. of Hours"
              color="pink-7"
              :rules="[(val) => Number.isFinite(Number(val)) && Number(val) >= 0 || 'No. of hours must be 0 or more']"
            />
            <q-input
              v-model.number="editAttendanceForm.ratePerHour"
              outlined
              dense
              type="number"
              min="0"
              step="0.01"
              prefix="₱"
              label="Rate Per Hour"
              color="pink-7"
              :rules="[(val) => Number.isFinite(Number(val)) && Number(val) >= 0 || 'Rate per hour must be 0 or more']"
            />
            <q-input
              v-model="editAttendanceForm.createdAt"
              outlined
              dense
              type="datetime-local"
              label="Date & Time"
              color="pink-7"
              :rules="[(val) => !!val && !Number.isNaN(buildManilaDateTime(val).getTime()) || 'Valid date and time are required']"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="grey-7" v-close-popup />
            <q-btn
              outline
              icon="content_copy"
              label="Create Copy"
              color="pink-7"
              :loading="copyingAttendance"
              :disable="savingAttendanceEdit"
              @click="createAttendanceCopy"
            />
            <q-btn
              unelevated
              type="submit"
              label="Submit"
              color="pink-7"
              :loading="savingAttendanceEdit"
              :disable="copyingAttendance"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { db, collection, doc, query, where, orderBy, limit, startAfter, getDoc, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from '../boot/firebase'
import { useUserStore } from '../stores/user'

const $q = useQuasar()
const userStore = useUserStore()
const isElectron = typeof window !== 'undefined' && Boolean(window.fingerprintVerification)

const enrolling = ref(false)
const refreshingEnroll = ref(false)
const enrollRunning = ref(false)
const enrollMessage = ref('')
let enrollSocket
let enrollConnectionRetry

const enrollStatusMessage = computed(() => {
  if (!isElectron) return 'Fingerprint enrollment is available in the desktop app.'
  if (enrollMessage.value) return enrollMessage.value
  return enrollRunning.value ? 'Enrollment service is running.' : 'Enrollment service is not running.'
})

async function refreshEnrollStatus () {
  if (!isElectron) return
  refreshingEnroll.value = true
  try {
    enrollRunning.value = await window.fingerprintEnrollment.isRunning()
    if (enrollRunning.value) connectToEnrollEvents()
  } finally {
    refreshingEnroll.value = false
  }
}

function connectToEnrollEvents (retriesRemaining = 10) {
  if (enrollSocket?.readyState === WebSocket.OPEN || enrollSocket?.readyState === WebSocket.CONNECTING) return

  enrollSocket = new WebSocket('ws://127.0.0.1:8092')
  enrollSocket.onmessage = (event) => {
    let result
    try {
      result = JSON.parse(event.data)
    } catch {
      return
    }

    if (result.type !== 'enroll') return

    console.log('Fingerprint enrollment event:', result)
    enrollMessage.value = result.message || ''

    if (result.status === 'success') {
      $q.notify({ type: 'positive', message: enrollMessage.value || `Enrolled ${result.name}.` })
      refreshEnrollStatus()
    } else if (result.status === 'error') {
      $q.notify({ type: 'negative', message: enrollMessage.value })
      refreshEnrollStatus()
    }
  }
  enrollSocket.onclose = () => {
    enrollSocket = undefined
    if (retriesRemaining > 0) {
      enrollConnectionRetry = window.setTimeout(() => connectToEnrollEvents(retriesRemaining - 1), 500)
    }
  }
}

async function startEnrollment () {
  enrolling.value = true
  try {
    await window.fingerprintEnrollment.start()
    await refreshEnrollStatus()
    enrollMessage.value = 'Starting fingerprint enrollment...'
    connectToEnrollEvents()
    $q.notify({ type: 'positive', message: 'Fingerprint enrollment started.' })
  } catch (error) {
    console.error('Could not start fingerprint enrollment:', error)
    $q.notify({ type: 'negative', message: 'Could not start fingerprint enrollment.' })
  } finally {
    enrolling.value = false
  }
}

const ATTENDANCE_PAGE_SIZE = 10
const attendanceRows = ref([])
const attendanceNameOptions = ref([])
const selectedAttendanceName = ref(null)
const loadingAttendance = ref(false)
const loadingAttendanceNames = ref(false)
const creatingRate = ref(false)
const printingPaySlip = ref(false)
const recordingEmployeeSalary = ref(false)
const invoiceStartDate = ref('')
const invoiceEndDate = ref('')
const editAttendanceDialog = ref(false)
const savingAttendanceEdit = ref(false)
const copyingAttendance = ref(false)
const editingAttendanceId = ref(null)
const editAttendanceForm = ref({
  logType: 'In',
  noOfHours: 0,
  ratePerHour: 0,
  createdAt: ''
})
const hasNextAttendancePage = ref(false)
const currentAttendancePage = ref(0)
// cursorsByPage[n] is the Firestore document to start after in order to fetch page n
const cursorsByPage = ref([undefined])
let lastDocOnPage = null

const attendanceColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' },
  { name: 'logType', label: 'Log Type', field: 'logType', align: 'center' },
  { name: 'noOfHours', label: 'No. of Hours', field: 'noOfHours', align: 'right' },
  { name: 'createdAt', label: 'Date & Time', field: 'createdAt', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]
const logTypeOptions = ['In', 'Out']

function getTodayInManilaInputValue () {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`
}

function buildManilaDateBoundary (dateValue, endOfDay = false) {
  const time = endOfDay ? '23:59:59.999' : '00:00:00.000'
  return new Date(`${dateValue}T${time}+08:00`)
}

function buildManilaDateTime (dateTimeValue) {
  return new Date(`${dateTimeValue}:00+08:00`)
}

function formatManilaDateTimeInput (date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
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

function formatAttendanceTimestamp (timestamp) {
  if (!timestamp?.toDate) return '—'
  return timestamp.toDate().toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

async function loadAttendanceNames () {
  loadingAttendanceNames.value = true
  try {
    const snapshot = await getDocs(query(collection(db, 'attendance'), orderBy('name')))
    const names = snapshot.docs
      .map((docSnap) => docSnap.data().name)
      .filter(Boolean)
    attendanceNameOptions.value = [...new Set(names)]
  } catch (error) {
    console.error('Could not load attendance names:', error)
    $q.notify({ type: 'negative', message: 'Could not load attendance names.' })
  } finally {
    loadingAttendanceNames.value = false
  }
}

async function loadAttendancePage (cursor) {
  loadingAttendance.value = true
  try {
    const attendanceRef = collection(db, 'attendance')
    const constraints = []
    if (selectedAttendanceName.value) constraints.push(where('name', '==', selectedAttendanceName.value))
    constraints.push(orderBy('createdAt', 'desc'))
    if (cursor) constraints.push(startAfter(cursor))
    constraints.push(limit(ATTENDANCE_PAGE_SIZE + 1))
    const snapshot = await getDocs(query(attendanceRef, ...constraints))
    const docs = snapshot.docs
    hasNextAttendancePage.value = docs.length > ATTENDANCE_PAGE_SIZE
    const pageDocs = docs.slice(0, ATTENDANCE_PAGE_SIZE)
    attendanceRows.value = pageDocs.map((docSnap) => {
      const data = docSnap.data()
      const createdAtDate = data.createdAt?.toDate?.() || data.createdAt
      return {
        id: docSnap.id,
        name: data.name,
        logType: data.logType,
        file: data.file,
        noOfHours: Number(data.noOfHours) || 0,
        ratePerHour: Number(data.ratePerHour) || 0,
        createdAt: formatAttendanceTimestamp(data.createdAt),
        createdAtDate
      }
    })
    lastDocOnPage = pageDocs[pageDocs.length - 1] || null
  } catch (error) {
    console.error('Could not load attendance logs:', error)
    $q.notify({ type: 'negative', message: 'Could not load attendance logs.' })
  } finally {
    loadingAttendance.value = false
  }
}

async function loadNextAttendancePage () {
  if (!hasNextAttendancePage.value) return
  cursorsByPage.value[currentAttendancePage.value + 1] = lastDocOnPage
  currentAttendancePage.value++
  await loadAttendancePage(cursorsByPage.value[currentAttendancePage.value])
}

async function loadPreviousAttendancePage () {
  if (currentAttendancePage.value === 0) return
  currentAttendancePage.value--
  await loadAttendancePage(cursorsByPage.value[currentAttendancePage.value])
}

async function reloadAttendance () {
  currentAttendancePage.value = 0
  cursorsByPage.value = [undefined]
  await loadAttendancePage(undefined)
}

async function createRate () {
  if (!userStore.isAdmin) return
  if (!selectedAttendanceName.value) return

  $q.dialog({
    title: 'Create Rate',
    message: `Set rate per hour for ${selectedAttendanceName.value}.`,
    prompt: {
      model: '',
      type: 'number',
      min: 0,
      step: '0.01',
      label: 'Rate per hour'
    },
    cancel: true,
    persistent: true
  }).onOk(async (value) => {
    const ratePerHour = Number(value)
    if (!Number.isFinite(ratePerHour) || ratePerHour <= 0) {
      $q.notify({ type: 'warning', message: 'Please enter a valid rate per hour.' })
      return
    }

    creatingRate.value = true
    try {
      const snapshot = await getDocs(query(
        collection(db, 'attendance'),
        where('name', '==', selectedAttendanceName.value)
      ))
      const docsWithoutRate = snapshot.docs.filter((docSnap) => {
        const data = docSnap.data()
        return data.ratePerHour === undefined || data.ratePerHour === null || data.ratePerHour === ''
      })
      await Promise.all(docsWithoutRate.map((docSnap) => updateDoc(doc(db, 'attendance', docSnap.id), { ratePerHour })))
      $q.notify({ type: 'positive', message: `Rate created for ${docsWithoutRate.length} attendance log(s).` })
      await reloadAttendance()
    } catch (error) {
      console.error('Could not create attendance rate:', error)
      $q.notify({ type: 'negative', message: 'Could not create attendance rate.' })
    } finally {
      creatingRate.value = false
    }
  })
}

async function printPaySlip () {
  if (!userStore.isAdmin) return
  if (!selectedAttendanceName.value) {
    $q.notify({ type: 'warning', message: 'Please select a name before printing a payslip.' })
    return
  }
  if (!invoiceStartDate.value || !invoiceEndDate.value) {
    $q.notify({ type: 'warning', message: 'Please select a start date and end date.' })
    return
  }

  const startDate = buildManilaDateBoundary(invoiceStartDate.value)
  const endDate = buildManilaDateBoundary(invoiceEndDate.value, true)
  if (endDate < startDate) {
    $q.notify({ type: 'warning', message: 'End date must be after start date.' })
    return
  }

  printingPaySlip.value = true
  try {
    const employeeName = selectedAttendanceName.value
    const [attendanceSnapshot, cashAdvanceSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'attendance'), where('logType', '==', 'Out'))),
      getDocs(query(collection(db, 'cashAdvances'), where('name', '==', employeeName)))
    ])

    const payslipRows = attendanceSnapshot.docs
      .map((docSnap) => {
        const data = docSnap.data()
        const createdAt = data.createdAt?.toDate?.() || data.createdAt
        const noOfHours = Number(data.noOfHours) || 0
        const ratePerHour = Number(data.ratePerHour) || 0
        return {
          name: data.name,
          createdAt,
          noOfHours,
          ratePerHour,
          total: noOfHours * ratePerHour
        }
      })
      .filter((row) => (
        row.name === employeeName &&
        row.createdAt instanceof Date &&
        row.createdAt >= startDate &&
        row.createdAt <= endDate
      ))
      .sort((first, second) => first.createdAt - second.createdAt)

    if (payslipRows.length === 0) {
      $q.notify({ type: 'warning', message: `No Out attendance logs found for ${employeeName} in the selected dates.` })
      return
    }

    const noOfHours = payslipRows.reduce((sum, row) => sum + row.noOfHours, 0)
    const grossTotal = payslipRows.reduce((sum, row) => sum + row.total, 0)
    const ratePerHour = noOfHours > 0 ? grossTotal / noOfHours : 0
    const cashAdvanceTotal = cashAdvanceSnapshot.docs.reduce((sum, docSnap) => {
      const data = docSnap.data()
      const createdAt = data.createdAt?.toDate?.() || data.createdAt
      if (!(createdAt instanceof Date) || createdAt < startDate || createdAt > endDate) return sum
      return sum + (Number(data.amount) || 0)
    }, 0)
    const grandTotal = grossTotal - cashAdvanceTotal

    await addDoc(collection(db, 'payslips'), {
      name: employeeName,
      startDate,
      endDate,
      noOfHours,
      ratePerHour,
      grossTotal,
      cashAdvanceTotal,
      grandTotal,
      createdAt: serverTimestamp(),
      createdBy: userStore.user?.uid || null
    })

    const tableRows = payslipRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.createdAt.toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          dateStyle: 'medium',
          timeStyle: 'short'
        }))}</td>
        <td class="number">${formatNumber(row.noOfHours)}</td>
        <td class="number">${formatNumber(row.ratePerHour)}</td>
        <td class="number">${formatNumber(row.total)}</td>
      </tr>
    `).join('')
    const cashAdvanceDisplay = cashAdvanceTotal > 0 ? formatNumber(cashAdvanceTotal) : 'N/A'
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${escapeHtml(employeeName)}</title>
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
            <div>Name: ${escapeHtml(employeeName)}</div>
            <div>Start Date: ${escapeHtml(invoiceStartDate.value)}</div>
            <div>End Date: ${escapeHtml(invoiceEndDate.value)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>No. of Hours</th>
                <th>Rate Per Hour</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="cash-advance">Cash Advance: ${cashAdvanceDisplay}</div>
          <div class="grand-total">Grand Total: ${formatNumber(grandTotal)}</div>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
    }

    $q.notify({ type: 'positive', message: 'Payslip created.' })
  } catch (error) {
    console.error('Could not print payslip:', error)
    $q.notify({ type: 'negative', message: 'Could not print payslip.' })
  } finally {
    printingPaySlip.value = false
  }
}

async function recordEmployeeSalary () {
  if (!userStore.isAdmin || !selectedAttendanceName.value) return
  if (!invoiceStartDate.value || !invoiceEndDate.value) {
    $q.notify({ type: 'warning', message: 'Please select a start date and end date.' })
    return
  }

  const startDate = buildManilaDateBoundary(invoiceStartDate.value)
  const endDate = buildManilaDateBoundary(invoiceEndDate.value, true)
  if (endDate < startDate) {
    $q.notify({ type: 'warning', message: 'End date must be after start date.' })
    return
  }

  recordingEmployeeSalary.value = true
  try {
    const employeeName = selectedAttendanceName.value
    const salaryId = `${encodeURIComponent(employeeName)}-${invoiceStartDate.value}-${invoiceEndDate.value}`
    const salaryRef = doc(db, 'employeeSalaries', salaryId)
    const [existingSalary, attendanceSnapshot, cashAdvanceSnapshot, salaryAccountSnapshot, cashAccountSnapshot] = await Promise.all([
      getDoc(salaryRef),
      getDocs(query(collection(db, 'attendance'), where('logType', '==', 'Out'))),
      getDocs(query(collection(db, 'cashAdvances'), where('name', '==', employeeName))),
      getDoc(doc(db, 'accounts', '5200')),
      getDoc(doc(db, 'accounts', '1000'))
    ])

    if (existingSalary.exists()) {
      $q.notify({ type: 'warning', message: 'Salary has already been recorded for this employee and period.' })
      return
    }

    const salaryAccount = salaryAccountSnapshot.data()
    const cashAccount = cashAccountSnapshot.data()
    if (!salaryAccountSnapshot.exists() || salaryAccount?.type !== 'expense' || salaryAccount.isActive === false) {
      $q.notify({ type: 'warning', message: 'Active account 5200 - Salaries and Wages Expense is required.' })
      return
    }
    if (!cashAccountSnapshot.exists() || cashAccount?.type !== 'asset' || cashAccount.isActive === false) {
      $q.notify({ type: 'warning', message: 'Active Cash account 1000 is required.' })
      return
    }

    const attendanceLogs = attendanceSnapshot.docs
      .map((docSnapshot) => {
        const data = docSnapshot.data()
        return {
          id: docSnapshot.id,
          name: data.name,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          noOfHours: Number(data.noOfHours) || 0,
          ratePerHour: Number(data.ratePerHour) || 0
        }
      })
      .filter((row) => (
        row.name === employeeName &&
        row.createdAt instanceof Date &&
        row.createdAt >= startDate &&
        row.createdAt <= endDate
      ))

    if (!attendanceLogs.length) {
      $q.notify({ type: 'warning', message: `No Out attendance logs found for ${employeeName} in the selected dates.` })
      return
    }

    const grossTotal = attendanceLogs.reduce((sum, row) => sum + (row.noOfHours * row.ratePerHour), 0)
    if (grossTotal <= 0) {
      $q.notify({ type: 'warning', message: 'The selected attendance has no payable salary.' })
      return
    }

    const cashAdvances = cashAdvanceSnapshot.docs
      .map((docSnapshot) => ({ id: docSnapshot.id, ref: docSnapshot.ref, ...docSnapshot.data() }))
      .filter((cashAdvance) => {
        const createdAt = cashAdvance.createdAt?.toDate?.() || cashAdvance.createdAt
        return !cashAdvance.employeeSalaryId && createdAt instanceof Date && createdAt >= startDate && createdAt <= endDate
      })
    const invalidAdvance = cashAdvances.find((cashAdvance) => !cashAdvance.accountId)
    if (invalidAdvance) {
      $q.notify({ type: 'warning', message: 'A cash advance in this period has no receivable account. Edit it before recording salary.' })
      return
    }

    const cashAdvanceTotal = cashAdvances.reduce((sum, cashAdvance) => sum + (Number(cashAdvance.amount) || 0), 0)
    const netTotal = grossTotal - cashAdvanceTotal
    if (netTotal < 0) {
      $q.notify({ type: 'warning', message: 'Cash advances exceed gross salary. Adjust the period or advances before recording.' })
      return
    }

    $q.dialog({
      title: 'Record Employee Salary',
      message: `Record ${employeeName}'s salary: gross ${formatNumber(grossTotal)}, advances ${formatNumber(cashAdvanceTotal)}, net pay ${formatNumber(netTotal)}?`,
      cancel: true,
      persistent: true
    }).onOk(async () => {
      recordingEmployeeSalary.value = true
      try {
        const journalEntryId = `employee-salary-${salaryId}`
        const advanceCredits = Object.entries(cashAdvances.reduce((totals, cashAdvance) => {
          totals[cashAdvance.accountId] = (totals[cashAdvance.accountId] || 0) + (Number(cashAdvance.amount) || 0)
          return totals
        }, {})).map(([accountId, credit]) => ({ accountId, debit: 0, credit }))
        const lines = [
          { accountId: '5200', debit: grossTotal, credit: 0 },
          ...advanceCredits
        ]
        if (netTotal > 0) lines.push({ accountId: '1000', debit: 0, credit: netTotal })

        const batch = writeBatch(db)
        batch.set(salaryRef, {
          name: employeeName,
          startDate,
          endDate,
          noOfHours: attendanceLogs.reduce((sum, row) => sum + row.noOfHours, 0),
          grossTotal,
          cashAdvanceTotal,
          netTotal,
          attendanceIds: attendanceLogs.map((row) => row.id),
          cashAdvanceIds: cashAdvances.map((cashAdvance) => cashAdvance.id),
          journalEntryId,
          createdAt: serverTimestamp(),
          createdBy: userStore.user?.uid || ''
        })
        batch.set(doc(db, 'journalEntries', journalEntryId), {
          transactionDate: endDate,
          description: `Employee salary for ${employeeName}`,
          referenceType: 'employeeSalary',
          referenceId: salaryId,
          totalDebit: grossTotal,
          totalCredit: grossTotal,
          status: 'draft',
          createdAt: serverTimestamp(),
          createdBy: userStore.user?.uid || '',
          lines
        })
        cashAdvances.forEach((cashAdvance) => {
          batch.update(cashAdvance.ref, {
            employeeSalaryId: salaryId,
            settledAt: serverTimestamp()
          })
        })
        await batch.commit()
        $q.notify({ type: 'positive', message: 'Employee salary and journal entry recorded.' })
      } catch (error) {
        console.error('Could not record employee salary:', error)
        $q.notify({ type: 'negative', message: 'Could not record employee salary.' })
      } finally {
        recordingEmployeeSalary.value = false
      }
    })
  } catch (error) {
    console.error('Could not prepare employee salary:', error)
    $q.notify({ type: 'negative', message: 'Could not prepare employee salary.' })
  } finally {
    recordingEmployeeSalary.value = false
  }
}

function openEditAttendance (attendance) {
  editingAttendanceId.value = attendance.id
  editAttendanceForm.value = {
    logType: attendance.logType || 'In',
    noOfHours: Number(attendance.noOfHours) || 0,
    ratePerHour: Number(attendance.ratePerHour) || 0,
    createdAt: formatManilaDateTimeInput(attendance.createdAtDate)
  }
  editAttendanceDialog.value = true
}

async function createAttendanceCopy () {
  if (!userStore.isAdmin || !editingAttendanceId.value) return

  copyingAttendance.value = true
  try {
    const sourceSnapshot = await getDoc(doc(db, 'attendance', editingAttendanceId.value))
    if (!sourceSnapshot.exists()) {
      $q.notify({ type: 'warning', message: 'The attendance log no longer exists.' })
      return
    }

    await addDoc(collection(db, 'attendance'), sourceSnapshot.data())
    editAttendanceDialog.value = false
    $q.notify({ type: 'positive', message: 'Attendance copy created.' })
    await reloadAttendance()
  } catch (error) {
    console.error('Could not copy attendance log:', error)
    $q.notify({ type: 'negative', message: 'Could not copy attendance log.' })
  } finally {
    copyingAttendance.value = false
  }
}

async function submitAttendanceEdit () {
  if (!editingAttendanceId.value) return

  const noOfHours = Number(editAttendanceForm.value.noOfHours)
  const ratePerHour = Number(editAttendanceForm.value.ratePerHour)
  const createdAt = buildManilaDateTime(editAttendanceForm.value.createdAt)
  if (!logTypeOptions.includes(editAttendanceForm.value.logType) || !Number.isFinite(noOfHours) || noOfHours < 0 || !Number.isFinite(ratePerHour) || ratePerHour < 0 || Number.isNaN(createdAt.getTime())) {
    $q.notify({ type: 'warning', message: 'Please enter valid attendance details.' })
    return
  }

  savingAttendanceEdit.value = true
  try {
    await updateDoc(doc(db, 'attendance', editingAttendanceId.value), {
      logType: editAttendanceForm.value.logType,
      noOfHours,
      ratePerHour,
      createdAt
    })
    $q.notify({ type: 'positive', message: 'Attendance log updated.' })
    editAttendanceDialog.value = false
    await reloadAttendance()
  } catch (error) {
    console.error('Could not update attendance log:', error)
    $q.notify({ type: 'negative', message: 'Could not update attendance log.' })
  } finally {
    savingAttendanceEdit.value = false
  }
}

function deleteAttendance (attendance) {
  $q.dialog({
    title: 'Delete Attendance Log',
    message: `Delete the attendance log for ${attendance.name}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await deleteDoc(doc(db, 'attendance', attendance.id))
      $q.notify({ type: 'positive', message: 'Attendance log deleted.' })
      await reloadAttendance()
    } catch (error) {
      console.error('Could not delete attendance log:', error)
      $q.notify({ type: 'negative', message: 'Could not delete attendance log.' })
    }
  })
}

onMounted(() => {
  const today = getTodayInManilaInputValue()
  invoiceStartDate.value = today
  invoiceEndDate.value = today
  refreshEnrollStatus()
  loadAttendanceNames()
  loadAttendancePage(undefined)
})

onBeforeUnmount(() => {
  window.clearTimeout(enrollConnectionRetry)
  enrollSocket?.close()
})
</script>

<style scoped>
.attendance-page {
  color: #4a2038;
}

.page-title {
  font-size: 2.2rem;
  font-weight: 900;
  line-height: 1.1;
}

.page-subtitle,
.verification-status {
  color: #8a4e71;
}

.verification-card {
  border: 1px solid rgba(233, 30, 140, 0.15);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.1);
}

.attendance-table-card {
  max-width: 960px;
}

.verification-icon {
  color: #e91e8c;
}

.verification-title {
  font-size: 1.15rem;
  font-weight: 800;
}

.is-running {
  color: #2e7d32;
}
</style>