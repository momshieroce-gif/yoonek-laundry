<template>
  <q-page class="attendance-page q-pa-md">
    <!-- Header -->
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Attendance</div>
        <div class="page-subtitle">
          {{ userStore.isAdmin ? 'View attendance records of all users' : 'View your attendance records' }}
        </div>
      </div>
    </div>

    <!-- Filters -->
    <q-card class="filter-card q-pa-md q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-sm-3">
          <q-input
            v-model="searchText"
            label="Search user / device"
            outlined
            dense
            clearable
            class="attendance-input"
          >
            <template v-slot:prepend>
              <q-icon name="search" color="pink-5" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-sm-3">
          <q-select
            v-model="selectedBranch"
            label="Branch"
            :options="branchOptions"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="attendance-input"
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input
            v-model="startDate"
            label="Start Date"
            type="date"
            outlined
            dense
            class="attendance-input"
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-input
            v-model="endDate"
            label="End Date"
            type="date"
            outlined
            dense
            class="attendance-input"
          />
        </div>
      </div>
    </q-card>

    <!-- Attendance table -->
    <q-card class="glass-card data-table">
      <q-table
        :rows="filteredAttendance"
        :columns="attendanceColumns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="getStatusColor(props.row.status)" rounded class="status-badge">
              {{ props.row.status }}
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-verifyMethod="props">
          <q-td :props="props">
            <q-icon
              v-if="props.row.verifyMethod"
              :name="getVerifyIcon(props.row.verifyMethod)"
              color="pink-5"
              size="18px"
              class="q-mr-xs"
            />
            {{ props.row.verifyMethod || '—' }}
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { db, collection, getDocs, query, where, orderBy } from '../boot/firebase'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const attendance = ref([])
const branches = ref([])
const searchText = ref('')
const selectedBranch = ref('')
const startDate = ref('')
const endDate = ref('')

const attendanceColumns = [
  { name: 'userName', label: 'User', field: 'userName', align: 'left', sortable: true },
  { name: 'branchName', label: 'Branch', field: 'branchName', align: 'left' },
  { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
  { name: 'timeIn', label: 'Time In', field: 'timeInDisplay', align: 'center' },
  { name: 'timeOut', label: 'Time Out', field: 'timeOutDisplay', align: 'center' },
  { name: 'workHours', label: 'Hours', field: 'workHours', align: 'right' },
  { name: 'verifyMethod', label: 'Verified By', field: 'verifyMethod', align: 'left' },
  { name: 'deviceId', label: 'Device', field: 'deviceId', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' }
]

const branchOptions = computed(() =>
  branches.value.map(branch => ({
    label: branch.name,
    value: branch.id
  }))
)

const filteredAttendance = computed(() => {
  let result = attendance.value

  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(record =>
      (record.userName || '').toLowerCase().includes(search) ||
      (record.deviceId || '').toLowerCase().includes(search) ||
      (record.biometricUserId || '').toLowerCase().includes(search)
    )
  }

  if (selectedBranch.value) {
    result = result.filter(record => record.branchId === selectedBranch.value)
  }

  if (startDate.value) {
    result = result.filter(record => record.date >= startDate.value)
  }

  if (endDate.value) {
    result = result.filter(record => record.date <= endDate.value)
  }

  return result
})

function formatTime(timestamp) {
  if (!timestamp) return '—'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getStatusColor(status) {
  const colors = {
    'Present': 'positive',
    'Late': 'orange',
    'Absent': 'negative',
    'On Leave': 'blue'
  }
  return colors[status] || 'grey'
}

function getVerifyIcon(method) {
  const icons = {
    fingerprint: 'fingerprint',
    face: 'face',
    card: 'badge',
    pin: 'pin'
  }
  return icons[method] || 'verified_user'
}

async function loadBranches() {
  try {
    const snapshot = await getDocs(collection(db, 'branches'))
    branches.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error loading branches:', error)
  }
}

async function loadAttendance() {
  loading.value = true
  try {
    const constraints = [orderBy('date', 'desc')]

    // Non-admin users only see their own attendance
    if (!userStore.isAdmin) {
      constraints.unshift(where('userId', '==', userStore.user?.uid))
    }

    const q = query(collection(db, 'attendance'), ...constraints)
    const snapshot = await getDocs(q)
    attendance.value = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timeInDisplay: formatTime(data.timeIn),
        timeOutDisplay: formatTime(data.timeOut)
      }
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load attendance: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 100))

  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }

  loadBranches()
  loadAttendance()
})
</script>

<style scoped>
/* ===== Pink attendance page ===== */
.attendance-page {
  color: #4A2038;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #E91E8C;
}

.page-subtitle {
  font-size: 14px;
  color: #B0568C;
}

.filter-card {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 8px 24px rgba(233, 30, 140, 0.12);
}

.glass-card {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(233, 30, 140, 0.12);
}

.data-table {
  overflow: hidden;
}

.status-badge {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
}

.attendance-input :deep(.q-field__control) {
  border-radius: 12px;
}
</style>
