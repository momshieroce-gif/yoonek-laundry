<template>
  <q-page class="attendance-assignment-page q-pa-md">
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Attendance Assignments</div>
        <div class="page-subtitle">Assign employee schedules, branches, and hourly rates</div>
      </div>
      <div class="header-actions">
        <q-btn
          flat
          round
          icon="refresh"
          color="pink-7"
          :loading="loading"
          @click="loadPageData"
        >
          <q-tooltip>Refresh attendance assignments</q-tooltip>
        </q-btn>
        <q-btn
          unelevated
          icon="add"
          label="New Assignment"
          color="pink-7"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <div class="table-heading q-mb-sm">
      <div>
        <div class="section-title">Current Assignments</div>
        <div class="section-subtitle">{{ assignments.length }} employee assignments</div>
      </div>
    </div>

    <q-table
      class="assignments-table"
      flat
      :rows="assignments"
      :columns="columns"
      row-key="id"
      :loading="loadingAssignments"
      :pagination="{ rowsPerPage: 10 }"
      no-data-label="No attendance assignments have been created."
    >
      <template v-slot:body-cell-name="props">
        <q-td :props="props">
          <div class="employee-cell">
            <q-avatar size="32px" color="pink-1" text-color="pink-8" icon="person" />
            <span class="text-weight-medium">{{ props.value }}</span>
          </div>
        </q-td>
      </template>
      <template v-slot:body-cell-noOfHours="props">
        <q-td :props="props">
          <div>{{ props.value }}</div>
          <div class="schedule-caption">{{ getOvertimeLabel(props.value) }}</div>
        </q-td>
      </template>
      <template v-slot:body-cell-branchId="props">
        <q-td :props="props">{{ getBranchLabel(props.value) }}</q-td>
      </template>
      <template v-slot:body-cell-ratePerHour="props">
        <q-td :props="props">
          <span class="rate-cell">{{ formatCurrency(props.value) }}</span>
        </q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            flat
            round
            dense
            icon="edit"
            color="pink-7"
            @click="openEditDialog(props.row)"
          >
            <q-tooltip>Edit assignment</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            icon="delete"
            color="negative"
            @click="confirmDelete(props.row)"
          >
            <q-tooltip>Delete assignment</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="assignmentDialog" persistent>
      <q-card class="assignment-dialog">
        <q-card-section class="dialog-header row items-center q-col-gutter-md">
          <div class="col-auto">
            <q-avatar color="pink-1" text-color="pink-8" icon="assignment_ind" />
          </div>
          <div class="col">
            <div class="dialog-title">{{ editingAssignmentId ? 'Edit Assignment' : 'New Assignment' }}</div>
            <div class="section-subtitle">Set the employee's schedule, branch, and hourly rate</div>
          </div>
        </q-card-section>

        <q-form @submit="saveAssignment">
          <q-card-section class="q-gutter-md">
            <q-select
              v-model="assignmentForm.name"
              outlined
              label="Employee Name"
              color="pink-7"
              :options="nameOptions"
              :loading="loadingNames"
              :rules="[(value) => !!value || 'Employee name is required']"
            >
              <template v-slot:prepend>
                <q-icon name="person" color="pink-7" />
              </template>
            </q-select>
            <q-select
              v-model="assignmentForm.noOfHoursId"
              outlined
              emit-value
              map-options
              label="Work Schedule"
              color="pink-7"
              :options="scheduleOptions"
              :loading="loadingSchedules"
              :rules="[(value) => !!value || 'Work schedule is required']"
            >
              <template v-slot:prepend>
                <q-icon name="schedule" color="pink-7" />
              </template>
            </q-select>
            <q-select
              v-model="assignmentForm.branchId"
              outlined
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
            <q-input
              v-model.number="assignmentForm.ratePerHour"
              outlined
              type="number"
              min="0.01"
              step="0.01"
              prefix="₱"
              label="Rate Per Hour"
              color="pink-7"
              :rules="[(value) => Number(value) > 0 || 'Rate per hour must be greater than 0']"
            >
              <template v-slot:prepend>
                <q-icon name="payments" color="pink-7" />
              </template>
            </q-input>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="Cancel" color="grey-7" :disable="saving" v-close-popup />
            <q-btn
              unelevated
              type="submit"
              icon="save"
              :label="editingAssignmentId ? 'Update' : 'Save'"
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
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { addDoc, collection, db, deleteDoc, doc, getDocs, updateDoc } from '../boot/firebase'

const $q = useQuasar()
const attendanceNames = ref([])
const schedules = ref([])
const branches = ref([])
const assignments = ref([])
const loadingNames = ref(false)
const loadingSchedules = ref(false)
const loadingBranches = ref(false)
const loadingAssignments = ref(false)
const saving = ref(false)
const assignmentDialog = ref(false)
const editingAssignmentId = ref(null)

const loading = computed(() => (
  loadingNames.value ||
  loadingSchedules.value ||
  loadingBranches.value ||
  loadingAssignments.value
))

const assignmentForm = ref({
  name: null,
  noOfHoursId: null,
  branchId: null,
  ratePerHour: null
})

const columns = [
  { name: 'name', label: 'Employee', field: 'name', align: 'left', sortable: true },
  { name: 'noOfHours', label: 'Work Schedule', field: 'noOfHours', align: 'left', sortable: true },
  { name: 'branchId', label: 'Branch', field: 'branchId', align: 'left', sortable: true },
  { name: 'ratePerHour', label: 'Rate Per Hour', field: 'ratePerHour', align: 'right', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const nameOptions = computed(() => [...new Set(attendanceNames.value)].sort((first, second) => first.localeCompare(second)))

const scheduleOptions = computed(() => schedules.value.map((schedule) => ({
  label: `${schedule.name} (${schedule.overtime} ${schedule.overtime === 1 ? 'hour' : 'hours'} overtime)`,
  value: schedule.id
})))

const branchOptions = computed(() => branches.value.map((branch) => ({
  label: branch.name,
  value: branch.id
})))

function formatCurrency (value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value) || 0)
}

function getBranchLabel (branchId) {
  return branches.value.find((branch) => branch.id === branchId)?.name || branchId || 'Unassigned'
}

function getOvertimeLabel (scheduleName) {
  const overtime = schedules.value.find((schedule) => schedule.name === scheduleName)?.overtime
  if (!Number.isFinite(overtime)) return 'Overtime unavailable'
  return `${overtime} ${overtime === 1 ? 'hour' : 'hours'} overtime`
}

async function loadNames () {
  loadingNames.value = true
  try {
    const snapshot = await getDocs(collection(db, 'attendance'))
    attendanceNames.value = snapshot.docs.map((item) => item.data().name).filter(Boolean)
  } finally {
    loadingNames.value = false
  }
}

async function loadSchedules () {
  loadingSchedules.value = true
  try {
    const snapshot = await getDocs(collection(db, 'noOfHours'))
    schedules.value = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((first, second) => first.name.localeCompare(second.name))
  } finally {
    loadingSchedules.value = false
  }
}

async function loadBranches () {
  loadingBranches.value = true
  try {
    const snapshot = await getDocs(collection(db, 'branches'))
    branches.value = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((first, second) => first.name.localeCompare(second.name))
  } finally {
    loadingBranches.value = false
  }
}

async function loadAssignments () {
  loadingAssignments.value = true
  try {
    const snapshot = await getDocs(collection(db, 'attendanceAssignments'))
    assignments.value = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((first, second) => first.name.localeCompare(second.name))
  } finally {
    loadingAssignments.value = false
  }
}

async function loadPageData () {
  try {
    await Promise.all([loadNames(), loadSchedules(), loadBranches(), loadAssignments()])
  } catch (error) {
    console.error('Could not load attendance assignment data:', error)
    $q.notify({ type: 'negative', message: 'Could not load attendance assignment data.' })
  }
}

function resetForm () {
  assignmentForm.value = {
    name: null,
    noOfHoursId: null,
    branchId: null,
    ratePerHour: null
  }
}

function openCreateDialog () {
  editingAssignmentId.value = null
  resetForm()
  assignmentDialog.value = true
}

function openEditDialog (assignment) {
  editingAssignmentId.value = assignment.id
  assignmentForm.value = {
    name: assignment.name,
    noOfHoursId: assignment.noOfHoursId || schedules.value.find((schedule) => schedule.name === assignment.noOfHours)?.id || null,
    branchId: assignment.branchId,
    ratePerHour: assignment.ratePerHour
  }
  assignmentDialog.value = true
}

async function saveAssignment () {
  const ratePerHour = Number(assignmentForm.value.ratePerHour)
  const schedule = schedules.value.find((item) => item.id === assignmentForm.value.noOfHoursId)
  if (!assignmentForm.value.name || !schedule || !assignmentForm.value.branchId || ratePerHour <= 0) {
    $q.notify({ type: 'warning', message: 'Please complete all assignment details.' })
    return
  }

  saving.value = true
  try {
    const assignmentData = {
      name: assignmentForm.value.name,
      noOfHours: schedule.name,
      noOfHoursId: schedule.id,
      branchId: assignmentForm.value.branchId,
      ratePerHour
    }

    if (editingAssignmentId.value) {
      await updateDoc(doc(db, 'attendanceAssignments', editingAssignmentId.value), assignmentData)
    } else {
      await addDoc(collection(db, 'attendanceAssignments'), assignmentData)
    }

    assignmentDialog.value = false
    $q.notify({
      type: 'positive',
      message: editingAssignmentId.value ? 'Attendance assignment updated.' : 'Attendance assignment saved.'
    })
    await loadAssignments()
  } catch (error) {
    console.error('Could not save attendance assignment:', error)
    $q.notify({ type: 'negative', message: 'Could not save attendance assignment.' })
  } finally {
    saving.value = false
  }
}

function confirmDelete (assignment) {
  $q.dialog({
    title: 'Delete Attendance Assignment',
    message: `Delete the attendance assignment for ${assignment.name}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await deleteDoc(doc(db, 'attendanceAssignments', assignment.id))
      $q.notify({ type: 'positive', message: 'Attendance assignment deleted.' })
      await loadAssignments()
    } catch (error) {
      console.error('Could not delete attendance assignment:', error)
      $q.notify({ type: 'negative', message: 'Could not delete attendance assignment.' })
    }
  })
}

onMounted(loadPageData)
</script>

<style scoped>
.attendance-assignment-page {
  color: #4a2038;
  max-width: 1180px;
}

.page-header,
.table-heading,
.employee-cell,
.header-actions {
  display: flex;
  align-items: center;
}

.page-header,
.table-heading {
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1.15;
}

.page-subtitle,
.section-subtitle,
.schedule-caption {
  color: #8a4e71;
}

.header-actions {
  gap: 8px;
}

.section-title {
  color: #4a2038;
  font-size: 1.1rem;
  font-weight: 800;
}

.section-subtitle,
.schedule-caption {
  font-size: 0.8rem;
}

.assignments-table {
  border: 1px solid rgba(194, 24, 91, 0.14);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(194, 24, 91, 0.08);
}

.employee-cell {
  gap: 10px;
}

.rate-cell {
  color: #c2185b;
  font-weight: 800;
}

.assignment-dialog {
  width: 460px;
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

@media (max-width: 599px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .header-actions .q-btn:last-child {
    flex: 1;
  }

  .page-title {
    font-size: 1.65rem;
  }
}
</style>