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
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { db, collection, query, orderBy, limit, startAfter, getDocs } from '../boot/firebase'

const $q = useQuasar()
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
const loadingAttendance = ref(false)
const hasNextAttendancePage = ref(false)
const currentAttendancePage = ref(0)
// cursorsByPage[n] is the Firestore document to start after in order to fetch page n
const cursorsByPage = ref([undefined])
let lastDocOnPage = null

const attendanceColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left' },
  { name: 'logType', label: 'Log Type', field: 'logType', align: 'center' },
  { name: 'createdAt', label: 'Date & Time', field: 'createdAt', align: 'left' }
]

function formatAttendanceTimestamp (timestamp) {
  if (!timestamp?.toDate) return '—'
  return timestamp.toDate().toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

async function loadAttendancePage (cursor) {
  loadingAttendance.value = true
  try {
    const attendanceRef = collection(db, 'attendance')
    const constraints = cursor
      ? [orderBy('createdAt', 'desc'), startAfter(cursor), limit(ATTENDANCE_PAGE_SIZE + 1)]
      : [orderBy('createdAt', 'desc'), limit(ATTENDANCE_PAGE_SIZE + 1)]
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

onMounted(() => {
  refreshEnrollStatus()
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