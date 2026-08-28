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
              label="Print"
              outline
              :loading="printingAttendance"
              :disable="!invoiceStartDate || !invoiceEndDate"
              @click="printAttendanceInvoice"
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
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="grey-7" v-close-popup />
            <q-btn
              unelevated
              type="submit"
              label="Submit"
              color="pink-7"
              :loading="savingAttendanceEdit"
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
import { db, collection, doc, query, where, orderBy, limit, startAfter, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from '../boot/firebase'
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
const printingAttendance = ref(false)
const invoiceStartDate = ref('')
const invoiceEndDate = ref('')
const editAttendanceDialog = ref(false)
const savingAttendanceEdit = ref(false)
const editingAttendanceId = ref(null)
const editAttendanceForm = ref({
  logType: 'In',
  noOfHours: 0
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
      return {
        id: docSnap.id,
        name: data.name,
        logType: data.logType,
        file: data.file,
        noOfHours: Number(data.noOfHours) || 0,
        createdAt: formatAttendanceTimestamp(data.createdAt)
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

async function printAttendanceInvoice () {
  if (!userStore.isAdmin) return
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

  printingAttendance.value = true
  try {
    const snapshot = await getDocs(query(
      collection(db, 'attendance'),
      where('logType', '==', 'Out')
    ))
    const groupedByName = new Map()

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data()
      const createdAt = data.createdAt?.toDate?.() || data.createdAt
      if (!(createdAt instanceof Date) || createdAt < startDate || createdAt > endDate) return

      const name = data.name || 'Unknown'
      const noOfHours = Number(data.noOfHours) || 0
      const ratePerHour = Number(data.ratePerHour) || 0
      const total = noOfHours * ratePerHour
      const current = groupedByName.get(name) || { name, noOfHours: 0, total: 0 }
      current.noOfHours += noOfHours
      current.total += total
      groupedByName.set(name, current)
    })

    const invoiceRows = [...groupedByName.values()]
      .map((row) => ({
        ...row,
        ratePerHour: row.noOfHours > 0 ? row.total / row.noOfHours : 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    const grandTotal = invoiceRows.reduce((sum, row) => sum + row.total, 0)

    if (invoiceRows.length === 0) {
      $q.notify({ type: 'warning', message: 'No Out attendance logs found for the selected dates.' })
      return
    }

    const invoiceRef = await addDoc(collection(db, 'serviceInvoices'), {
      startDate,
      endDate,
      attendance: invoiceRows.map((row) => ({
        name: row.name,
        noOfHours: row.noOfHours,
        ratePerHour: row.ratePerHour,
        total: row.total
      })),
      grandTotal,
      createdAt: serverTimestamp(),
      createdBy: userStore.user?.uid || null
    })

    const tableRows = invoiceRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td class="number">${formatNumber(row.noOfHours)}</td>
        <td class="number">${formatNumber(row.ratePerHour)}</td>
        <td class="number">${formatNumber(row.total)}</td>
      </tr>
    `).join('')
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Service Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            .meta { margin-bottom: 20px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f6f6f6; }
            .number { text-align: right; }
            .grand-total { margin-top: 16px; text-align: right; font-size: 18px; font-weight: 700; }
          </style>
        </head>
        <body onload="window.print()">
          <h1>Service Invoice</h1>
          <div class="meta">
            <div>Invoice ID: ${escapeHtml(invoiceRef.id)}</div>
            <div>Start Date: ${escapeHtml(invoiceStartDate.value)}</div>
            <div>End Date: ${escapeHtml(invoiceEndDate.value)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>No. of Hours</th>
                <th>Rate Per Hour</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
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

    $q.notify({ type: 'positive', message: 'Service invoice created.' })
  } catch (error) {
    console.error('Could not print attendance invoice:', error)
    $q.notify({ type: 'negative', message: 'Could not print attendance invoice.' })
  } finally {
    printingAttendance.value = false
  }
}

function openEditAttendance (attendance) {
  editingAttendanceId.value = attendance.id
  editAttendanceForm.value = {
    logType: attendance.logType || 'In',
    noOfHours: Number(attendance.noOfHours) || 0
  }
  editAttendanceDialog.value = true
}

async function submitAttendanceEdit () {
  if (!editingAttendanceId.value) return

  const noOfHours = Number(editAttendanceForm.value.noOfHours)
  if (!logTypeOptions.includes(editAttendanceForm.value.logType) || !Number.isFinite(noOfHours) || noOfHours < 0) {
    $q.notify({ type: 'warning', message: 'Please enter valid attendance details.' })
    return
  }

  savingAttendanceEdit.value = true
  try {
    await updateDoc(doc(db, 'attendance', editingAttendanceId.value), {
      logType: editAttendanceForm.value.logType,
      noOfHours
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