<template>
  <q-page class="journal-page q-pa-md">
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Journal Entries</div>
        <div class="page-subtitle">Review the permanent ledger and prepare manual journal drafts</div>
      </div>
      <q-btn color="pink-7" icon="add" label="New Draft" unelevated @click="openCreateDialog" />
    </div>

    <section class="filter-panel q-pa-md q-mb-lg">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-3">
          <q-input v-model.trim="search" outlined dense clearable label="Search description or reference" color="pink-7">
            <template v-slot:prepend><q-icon name="search" color="pink-7" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-select
            v-model="selectedStatus"
            outlined
            dense
            clearable
            emit-value
            map-options
            label="Status"
            color="pink-7"
            :options="statusOptions"
          />
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-select
            v-model="selectedBranch"
            outlined
            dense
            clearable
            emit-value
            map-options
            label="Branch"
            color="pink-7"
            :options="branchFilterOptions"
          />
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-input v-model="startDate" outlined dense type="date" label="Start Date" color="pink-7" />
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-input v-model="endDate" outlined dense type="date" label="End Date" color="pink-7" />
        </div>
        <div class="col-12 col-md-1 row justify-end">
          <q-btn flat round icon="refresh" color="pink-7" :loading="loadingEntries" @click="loadEntries">
            <q-tooltip>Refresh journal entries</q-tooltip>
          </q-btn>
        </div>
      </div>
    </section>

    <div class="summary-strip q-mb-md">
      <div><span>Entries</span><strong>{{ filteredEntries.length }}</strong></div>
      <div><span>Total debits</span><strong>{{ formatCurrency(filteredDebitTotal) }}</strong></div>
      <div><span>Total credits</span><strong>{{ formatCurrency(filteredCreditTotal) }}</strong></div>
    </div>

    <div class="selection-toolbar q-mb-md">
      <q-checkbox
        :model-value="allDraftsSelected"
        :indeterminate="someDraftsSelected && !allDraftsSelected"
        color="pink-7"
        label="Select all filtered drafts"
        :disable="!filteredDraftEntries.length || postingSelected"
        @update:model-value="toggleAllDrafts"
      />
      <q-btn
        color="positive"
        icon="task_alt"
        :label="`Post Selected (${selectedEntries.length})`"
        unelevated
        :loading="postingSelected"
        :disable="!selectedEntries.length"
        @click="confirmPostSelected"
      />
    </div>

    <q-table
      class="journal-table"
      flat
      row-key="id"
      :rows="filteredEntries"
      :columns="columns"
      :loading="loadingEntries"
      :pagination="{ rowsPerPage: 10 }"
      no-data-label="No journal entries match these filters."
    >
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td auto-width>
            <q-checkbox
              :model-value="isEntrySelected(props.row.id)"
              color="pink-7"
              :disable="props.row.status !== 'draft' || postingSelected"
              @update:model-value="toggleEntrySelection(props.row)"
            />
          </q-td>
          <q-td auto-width>
            <q-btn flat round dense :icon="props.expand ? 'expand_less' : 'expand_more'" @click="props.expand = !props.expand">
              <q-tooltip>{{ props.expand ? 'Hide journal lines' : 'Show journal lines' }}</q-tooltip>
            </q-btn>
          </q-td>
          <q-td key="transactionDate" :props="props">{{ formatDate(props.row.transactionDate) }}</q-td>
          <q-td key="description" :props="props">
            <div class="description-cell">{{ props.row.description }}</div>
            <div class="reference-text">{{ formatReference(props.row) }}</div>
          </q-td>
          <q-td key="branchId" :props="props">{{ branchLabel(props.row.branchId) }}</q-td>
          <q-td key="totalDebit" :props="props">{{ formatCurrency(props.row.totalDebit) }}</q-td>
          <q-td key="totalCredit" :props="props">{{ formatCurrency(props.row.totalCredit) }}</q-td>
          <q-td key="status" :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="formatLabel(props.row.status)" />
          </q-td>
          <q-td key="actions" :props="props">
            <template v-if="props.row.status === 'draft'">
              <q-btn flat round dense icon="edit" color="pink-7" @click="openEditDialog(props.row)">
                <q-tooltip>Edit draft</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="task_alt" color="positive" @click="confirmPost(props.row)">
                <q-tooltip>Post draft permanently</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)">
                <q-tooltip>Delete draft</q-tooltip>
              </q-btn>
            </template>
            <q-icon v-else name="lock" color="grey-6" size="20px">
              <q-tooltip>{{ immutableStatusMessage(props.row.status) }}</q-tooltip>
            </q-icon>
          </q-td>
        </q-tr>
        <q-tr v-show="props.expand" :props="props">
          <q-td colspan="100%" class="lines-panel">
            <div class="lines-header">Journal lines</div>
            <div v-for="(line, index) in props.row.lines" :key="`${props.row.id}-${index}`" class="line-row">
              <span class="line-account">{{ accountLabel(line.accountId) }}</span>
              <span>Debit {{ formatCurrency(line.debit) }}</span>
              <span>Credit {{ formatCurrency(line.credit) }}</span>
            </div>
            <div v-if="props.row.reversalEntryId" class="reversal-note">
              Reversal entry: {{ props.row.reversalEntryId }}
            </div>
          </q-td>
        </q-tr>
      </template>
    </q-table>

    <q-dialog v-model="entryDialog" persistent>
      <q-card class="entry-dialog">
        <q-card-section class="dialog-header">
          <div class="dialog-title">{{ editingEntryId ? 'Edit Journal Draft' : 'New Journal Draft' }}</div>
          <div class="dialog-subtitle">Drafts remain editable until they are posted</div>
        </q-card-section>

        <q-form @submit="saveDraft">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model.trim="entryForm.description"
              outlined
              dense
              label="Description"
              color="pink-7"
              :rules="[(value) => !!value || 'Description is required']"
            />
            <q-input
              v-model="entryForm.transactionDate"
              outlined
              dense
              type="date"
              label="Transaction Date"
              color="pink-7"
              :rules="[(value) => !!value || 'Transaction date is required']"
            />
            <q-select
              v-model="entryForm.branchId"
              outlined
              dense
              clearable
              emit-value
              map-options
              label="Branch (optional)"
              color="pink-7"
              :options="branchOptions"
            />

            <div class="line-editor-header">
              <div>
                <div class="text-weight-bold">Journal lines</div>
                <div class="dialog-subtitle">Enter a debit or credit on each line</div>
              </div>
              <q-btn flat round icon="add" color="pink-7" @click="addLine">
                <q-tooltip>Add journal line</q-tooltip>
              </q-btn>
            </div>

            <div v-for="(line, index) in entryForm.lines" :key="index" class="editor-line">
              <q-select
                v-model="line.accountId"
                outlined
                dense
                emit-value
                map-options
                label="Account"
                color="pink-7"
                :options="accountOptions"
                :rules="[(value) => !!value || 'Account is required']"
              />
              <q-input v-model.number="line.debit" outlined dense type="number" min="0" step="0.01" prefix="₱" label="Debit" color="pink-7" />
              <q-input v-model.number="line.credit" outlined dense type="number" min="0" step="0.01" prefix="₱" label="Credit" color="pink-7" />
              <q-btn flat round dense icon="remove_circle_outline" color="negative" :disable="entryForm.lines.length <= 2" @click="removeLine(index)">
                <q-tooltip>Remove journal line</q-tooltip>
              </q-btn>
            </div>

            <div class="draft-totals" :class="{ 'is-unbalanced': !formIsBalanced }">
              <span>Debit {{ formatCurrency(formDebitTotal) }}</span>
              <span>Credit {{ formatCurrency(formCreditTotal) }}</span>
              <strong>{{ formIsBalanced ? 'Balanced' : 'Unbalanced draft' }}</strong>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="Cancel" color="grey-7" :disable="savingDraft" v-close-popup />
            <q-btn unelevated type="submit" icon="save" label="Save Draft" color="pink-7" :loading="savingDraft" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from '../boot/firebase'
import { useUserStore } from '../stores/user'

const $q = useQuasar()
const userStore = useUserStore()
const entries = ref([])
const accounts = ref([])
const branches = ref([])
const selectedEntries = ref([])
const loadingEntries = ref(false)
const savingDraft = ref(false)
const postingSelected = ref(false)
const entryDialog = ref(false)
const editingEntryId = ref(null)
const search = ref('')
const selectedStatus = ref(null)
const selectedBranch = ref(null)
const startDate = ref('')
const endDate = ref('')

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Posted', value: 'posted' },
  { label: 'Voided', value: 'voided' },
  { label: 'Reversed', value: 'reversed' }
]

const columns = [
  { name: 'select', label: '', field: 'select', align: 'center' },
  { name: 'expand', label: '', field: 'expand', align: 'center' },
  { name: 'transactionDate', label: 'Date', field: 'transactionDate', align: 'left', sortable: true },
  { name: 'description', label: 'Description', field: 'description', align: 'left', sortable: true },
  { name: 'branchId', label: 'Branch', field: 'branchId', align: 'left', sortable: true },
  { name: 'totalDebit', label: 'Debit', field: 'totalDebit', align: 'right', sortable: true },
  { name: 'totalCredit', label: 'Credit', field: 'totalCredit', align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

const entryForm = ref(emptyForm())

const accountOptions = computed(() => accounts.value
  .filter((account) => account.isActive !== false)
  .map((account) => ({ label: `${account.code} - ${account.name}`, value: account.id })))

const branchOptions = computed(() => branches.value.map((branch) => ({ label: branch.name, value: branch.id })))
const branchFilterOptions = computed(() => [
  ...branchOptions.value,
  { label: 'Unassigned', value: '__unassigned__' }
])

const filteredEntries = computed(() => {
  const term = search.value.toLowerCase()
  const filterStart = startDate.value ? buildManilaDateBoundary(startDate.value) : null
  const filterEnd = endDate.value ? buildManilaDateBoundary(endDate.value, true) : null

  return entries.value.filter((entry) => {
    if (selectedStatus.value && entry.status !== selectedStatus.value) return false
    if (selectedBranch.value === '__unassigned__' && entry.branchId) return false
    if (selectedBranch.value && selectedBranch.value !== '__unassigned__' && entry.branchId !== selectedBranch.value) return false
    if (term && !`${entry.description} ${entry.referenceType} ${entry.referenceId}`.toLowerCase().includes(term)) return false
    const transactionDate = toDate(entry.transactionDate)
    if (filterStart && (!transactionDate || transactionDate < filterStart)) return false
    if (filterEnd && (!transactionDate || transactionDate > filterEnd)) return false
    return true
  })
})

const filteredDraftEntries = computed(() => filteredEntries.value.filter((entry) => entry.status === 'draft'))
const allDraftsSelected = computed(() => (
  filteredDraftEntries.value.length > 0 &&
  filteredDraftEntries.value.every((entry) => selectedEntries.value.some((selected) => selected.id === entry.id))
))
const someDraftsSelected = computed(() => filteredDraftEntries.value.some((entry) => isEntrySelected(entry.id)))

const filteredDebitTotal = computed(() => filteredEntries.value.reduce((sum, entry) => sum + entry.totalDebit, 0))
const filteredCreditTotal = computed(() => filteredEntries.value.reduce((sum, entry) => sum + entry.totalCredit, 0))
const formDebitTotal = computed(() => totalLines(entryForm.value.lines, 'debit'))
const formCreditTotal = computed(() => totalLines(entryForm.value.lines, 'credit'))
const formIsBalanced = computed(() => formDebitTotal.value > 0 && Math.abs(formDebitTotal.value - formCreditTotal.value) < 0.005)

function emptyForm () {
  return {
    description: '',
    transactionDate: getTodayInManila(),
    branchId: '',
    lines: [emptyLine(), emptyLine()]
  }
}

function emptyLine () {
  return { accountId: '', debit: 0, credit: 0 }
}

function toDate (timestamp) {
  if (timestamp?.toDate) return timestamp.toDate()
  if (timestamp instanceof Date) return timestamp
  return null
}

function totalLines (lines, side) {
  return lines.reduce((sum, line) => sum + (Number(line[side]) || 0), 0)
}

function getTodayInManila () {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function buildManilaDateBoundary (value, endOfDay = false) {
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+08:00`)
}

function formatCurrency (value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0)
}

function formatDate (timestamp) {
  const date = toDate(timestamp)
  return date ? date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }) : 'Date unavailable'
}

function formatLabel (value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown'
}

function statusColor (status) {
  return { draft: 'warning', posted: 'positive', voided: 'grey-7', reversed: 'deep-orange-7' }[status] || 'grey-6'
}

function immutableStatusMessage (status) {
  return {
    posted: 'Posted entries are permanent accounting records',
    voided: 'Voided entries cannot be changed',
    reversed: 'Reversed entries are retained for the audit trail'
  }[status] || 'This entry cannot be changed'
}

function accountLabel (accountId) {
  const account = accounts.value.find((item) => item.id === accountId)
  return account ? `${account.code} - ${account.name}` : accountId || 'Unknown account'
}

function branchLabel (branchId) {
  if (!branchId) return 'Unassigned'
  return branches.value.find((branch) => branch.id === branchId)?.name || branchId
}

function isEntrySelected (entryId) {
  return selectedEntries.value.some((entry) => entry.id === entryId)
}

function toggleEntrySelection (entry) {
  if (entry.status !== 'draft') return
  selectedEntries.value = isEntrySelected(entry.id)
    ? selectedEntries.value.filter((selected) => selected.id !== entry.id)
    : [...selectedEntries.value, entry]
}

function toggleAllDrafts (selected) {
  const filteredIds = new Set(filteredDraftEntries.value.map((entry) => entry.id))
  const outsideFilter = selectedEntries.value.filter((entry) => !filteredIds.has(entry.id))
  selectedEntries.value = selected ? [...outsideFilter, ...filteredDraftEntries.value] : outsideFilter
}

function formatReference (entry) {
  if (!entry.referenceType || entry.referenceType === 'manual') return 'Manual journal'
  return `${formatLabel(entry.referenceType)} · ${entry.referenceId || 'No reference'}`
}

async function loadEntries () {
  loadingEntries.value = true
  try {
    const [entrySnapshot, accountSnapshot, branchSnapshot] = await Promise.all([
      getDocs(collection(db, 'journalEntries')),
      getDocs(collection(db, 'accounts')),
      getDocs(collection(db, 'branches'))
    ])
    accounts.value = accountSnapshot.docs
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
      .sort((first, second) => first.code.localeCompare(second.code, undefined, { numeric: true }))
    branches.value = branchSnapshot.docs
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
      .sort((first, second) => first.name.localeCompare(second.name))
    entries.value = entrySnapshot.docs
      .map((snapshot) => {
        const data = snapshot.data()
        return {
          id: snapshot.id,
          description: data.description || 'Untitled journal entry',
          transactionDate: data.transactionDate || data.createdAt || null,
          referenceType: data.referenceType || 'manual',
          referenceId: data.referenceId || '',
          branchId: data.branchId || '',
          totalDebit: Number(data.totalDebit) || 0,
          totalCredit: Number(data.totalCredit) || 0,
          status: data.status || (data.referenceType ? 'posted' : 'draft'),
          lines: Array.isArray(data.lines) ? data.lines : [],
          reversalEntryId: data.reversalEntryId || '',
          createdAt: data.createdAt || null,
          createdBy: data.createdBy || ''
        }
      })
      .sort((first, second) => (toDate(second.transactionDate)?.getTime() || 0) - (toDate(first.transactionDate)?.getTime() || 0))
    const currentDraftIds = new Set(entries.value.filter((entry) => entry.status === 'draft').map((entry) => entry.id))
    selectedEntries.value = selectedEntries.value.filter((entry) => currentDraftIds.has(entry.id))
  } catch (error) {
    console.error('Could not load journal entries:', error)
    $q.notify({ type: 'negative', message: 'Could not load journal entries.' })
  } finally {
    loadingEntries.value = false
  }
}

function openCreateDialog () {
  editingEntryId.value = null
  entryForm.value = emptyForm()
  entryDialog.value = true
}

function openEditDialog (entry) {
  if (entry.status !== 'draft') return
  editingEntryId.value = entry.id
  entryForm.value = {
    description: entry.description,
    transactionDate: toDate(entry.transactionDate)?.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) || getTodayInManila(),
    branchId: entry.branchId || '',
    lines: entry.lines.map((line) => ({
      accountId: line.accountId || '',
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0
    }))
  }
  while (entryForm.value.lines.length < 2) entryForm.value.lines.push(emptyLine())
  entryDialog.value = true
}

function addLine () {
  entryForm.value.lines.push(emptyLine())
}

function removeLine (index) {
  if (entryForm.value.lines.length > 2) entryForm.value.lines.splice(index, 1)
}

function normalizedLines () {
  return entryForm.value.lines.map((line) => ({
    accountId: line.accountId,
    debit: Number(line.debit) || 0,
    credit: Number(line.credit) || 0
  }))
}

function validateLines (lines, requireBalanced = false) {
  if (lines.some((line) => !line.accountId || line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0))) {
    $q.notify({ type: 'warning', message: 'Each line needs an account and may contain either a debit or a credit.' })
    return false
  }
  if (requireBalanced && !formIsBalanced.value) {
    $q.notify({ type: 'warning', message: 'A journal must be balanced and greater than zero before posting.' })
    return false
  }
  return true
}

async function saveDraft () {
  const lines = normalizedLines()
  if (!entryForm.value.description || !entryForm.value.transactionDate || !validateLines(lines)) return

  savingDraft.value = true
  try {
    const entryRef = editingEntryId.value
      ? doc(db, 'journalEntries', editingEntryId.value)
      : doc(collection(db, 'journalEntries'))
    if (editingEntryId.value) {
      const currentSnapshot = await getDoc(entryRef)
      if (!currentSnapshot.exists() || currentSnapshot.data().status !== 'draft') {
        entryDialog.value = false
        $q.notify({ type: 'warning', message: 'This entry is no longer an editable draft.' })
        await loadEntries()
        return
      }
    }
    const draftData = {
      description: entryForm.value.description,
      transactionDate: buildManilaDateBoundary(entryForm.value.transactionDate),
      referenceType: 'manual',
      referenceId: entryRef.id,
      branchId: entryForm.value.branchId || '',
      totalDebit: totalLines(lines, 'debit'),
      totalCredit: totalLines(lines, 'credit'),
      status: 'draft',
      lines,
      updatedAt: serverTimestamp()
    }
    if (editingEntryId.value) {
      await updateDoc(entryRef, draftData)
    } else {
      await setDoc(entryRef, {
        ...draftData,
        createdAt: serverTimestamp(),
        createdBy: userStore.user?.uid || ''
      })
    }
    entryDialog.value = false
    $q.notify({ type: 'positive', message: editingEntryId.value ? 'Journal draft updated.' : 'Journal draft created.' })
    await loadEntries()
  } catch (error) {
    console.error('Could not save journal draft:', error)
    $q.notify({ type: 'negative', message: 'Could not save journal draft.' })
  } finally {
    savingDraft.value = false
  }
}

function confirmPost (entry) {
  if (entry.status !== 'draft') return
  entryForm.value.lines = entry.lines.map((line) => ({ ...line }))
  if (!validateLines(entryForm.value.lines, true)) return

  $q.dialog({
    title: 'Post Journal Entry',
    message: 'Post this balanced draft? Posted entries are permanent and cannot be edited or deleted.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const entryRef = doc(db, 'journalEntries', entry.id)
      const currentSnapshot = await getDoc(entryRef)
      if (!currentSnapshot.exists() || currentSnapshot.data().status !== 'draft') {
        $q.notify({ type: 'warning', message: 'This entry is no longer a draft.' })
        await loadEntries()
        return
      }
      const currentLines = Array.isArray(currentSnapshot.data().lines) ? currentSnapshot.data().lines : []
      entryForm.value.lines = currentLines.map((line) => ({ ...line }))
      if (!validateLines(entryForm.value.lines, true)) return
      await updateDoc(entryRef, {
        status: 'posted',
        postedAt: serverTimestamp(),
        postedBy: userStore.user?.uid || '',
        updatedAt: serverTimestamp()
      })
      $q.notify({ type: 'positive', message: 'Journal entry posted permanently.' })
      await loadEntries()
    } catch (error) {
      console.error('Could not post journal entry:', error)
      $q.notify({ type: 'negative', message: 'Could not post journal entry.' })
    }
  })
}

function confirmPostSelected () {
  const selectedDrafts = selectedEntries.value.filter((entry) => entry.status === 'draft')
  if (!selectedDrafts.length) return
  const unbalancedEntry = selectedDrafts.find((entry) => !linesAreBalanced(entry.lines))
  if (unbalancedEntry) {
    $q.notify({ type: 'warning', message: `“${unbalancedEntry.description}” is not balanced and cannot be posted.` })
    return
  }
  if (selectedDrafts.length > 500) {
    $q.notify({ type: 'warning', message: 'Post at most 500 journal entries at a time.' })
    return
  }

  $q.dialog({
    title: 'Post Selected Journal Entries',
    message: `Post ${selectedDrafts.length} selected draft(s)? Posted entries are permanent and cannot be edited or deleted.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    postingSelected.value = true
    try {
      const snapshots = await Promise.all(selectedDrafts.map((entry) => getDoc(doc(db, 'journalEntries', entry.id))))
      const invalidSnapshot = snapshots.find((snapshot) => (
        !snapshot.exists() ||
        snapshot.data().status !== 'draft' ||
        !linesAreBalanced(snapshot.data().lines)
      ))
      if (invalidSnapshot) {
        $q.notify({ type: 'warning', message: 'A selected entry changed or is unbalanced. Refresh and review the selection.' })
        await loadEntries()
        return
      }

      const batch = writeBatch(db)
      snapshots.forEach((snapshot) => {
        batch.update(snapshot.ref, {
          status: 'posted',
          postedAt: serverTimestamp(),
          postedBy: userStore.user?.uid || '',
          updatedAt: serverTimestamp()
        })
      })
      await batch.commit()
      selectedEntries.value = []
      $q.notify({ type: 'positive', message: `${snapshots.length} journal entries posted permanently.` })
      await loadEntries()
    } catch (error) {
      console.error('Could not post selected journal entries:', error)
      $q.notify({ type: 'negative', message: 'Could not post selected journal entries.' })
    } finally {
      postingSelected.value = false
    }
  })
}

function linesAreBalanced (lines) {
  if (!Array.isArray(lines) || lines.length < 2) return false
  const debit = totalLines(lines, 'debit')
  const credit = totalLines(lines, 'credit')
  return debit > 0 && Math.abs(debit - credit) < 0.005 && lines.every((line) => (
    line.accountId &&
    Number(line.debit || 0) >= 0 &&
    Number(line.credit || 0) >= 0 &&
    !(Number(line.debit || 0) > 0 && Number(line.credit || 0) > 0)
  ))
}

function confirmDelete (entry) {
  if (entry.status !== 'draft') return
  $q.dialog({
    title: 'Delete Journal Draft',
    message: `Delete “${entry.description}”?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const entryRef = doc(db, 'journalEntries', entry.id)
      const currentSnapshot = await getDoc(entryRef)
      if (!currentSnapshot.exists() || currentSnapshot.data().status !== 'draft') {
        $q.notify({ type: 'warning', message: 'Only current drafts can be deleted.' })
        await loadEntries()
        return
      }
      await deleteDoc(entryRef)
      $q.notify({ type: 'positive', message: 'Journal draft deleted.' })
      await loadEntries()
    } catch (error) {
      console.error('Could not delete journal draft:', error)
      $q.notify({ type: 'negative', message: 'Could not delete journal draft.' })
    }
  })
}

onMounted(loadEntries)
</script>

<style scoped>
.journal-page {
  color: #4a2038;
  max-width: 1320px;
}

.page-header,
.line-editor-header {
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
.dialog-subtitle,
.reference-text {
  color: #8a4e71;
}

.filter-panel {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(194, 24, 91, 0.16);
  border-left: 4px solid #c2185b;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(194, 24, 91, 0.08);
}

.summary-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.selection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 4px;
}

.summary-strip > div {
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.72);
  border-left: 3px solid #c2185b;
}

.summary-strip span {
  color: #8a4e71;
  font-size: 0.78rem;
}

.summary-strip strong {
  color: #c2185b;
  font-size: 1.15rem;
}

.journal-table {
  border: 1px solid rgba(194, 24, 91, 0.14);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(194, 24, 91, 0.08);
}

.description-cell {
  max-width: 360px;
  white-space: normal;
  font-weight: 700;
}

.reference-text {
  font-size: 0.75rem;
}

.lines-panel {
  background: #fff7fb;
  padding: 14px 24px !important;
}

.lines-header {
  font-weight: 800;
  margin-bottom: 8px;
}

.line-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 150px 150px;
  gap: 16px;
  padding: 7px 0;
  border-top: 1px solid rgba(194, 24, 91, 0.1);
}

.line-account {
  font-weight: 600;
}

.reversal-note {
  margin-top: 10px;
  color: #bf360c;
}

.entry-dialog {
  width: 760px;
  max-width: 94vw;
  border-top: 4px solid #c2185b;
}

.dialog-title {
  font-size: 1.25rem;
  font-weight: 800;
}

.editor-line {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 150px 150px 36px;
  align-items: start;
  gap: 10px;
}

.draft-totals {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  padding: 12px;
  color: #2e7d32;
  background: #f1f8f2;
}

.draft-totals.is-unbalanced {
  color: #b71c1c;
  background: #fff2f2;
}

@media (max-width: 700px) {
  .editor-line,
  .line-row {
    grid-template-columns: 1fr;
  }

  .draft-totals {
    flex-direction: column;
    gap: 4px;
  }
}
</style>