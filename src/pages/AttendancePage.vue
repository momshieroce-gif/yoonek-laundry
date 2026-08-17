<template>
  <q-page class="attendance-page q-pa-md">
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Attendance</div>
        <div class="page-subtitle">Start fingerprint verification before recording attendance.</div>
      </div>
    </div>

    <q-card class="verification-card">
      <q-card-section class="q-pa-lg">
        <div class="row items-center q-col-gutter-lg">
          <div class="col-auto">
            <q-icon name="fingerprint" size="3rem" class="verification-icon" />
          </div>
          <div class="col">
            <div class="verification-title">Fingerprint verification</div>
            <div class="verification-status" :class="isRunning ? 'is-running' : ''">
              {{ statusMessage }}
            </div>
          </div>
          <div class="col-12 col-sm-auto">
            <q-btn
              flat
              color="pink-7"
              icon="refresh"
              class="q-mr-sm"
              :loading="restarting"
              :disable="!isElectron"
              @click="restartVerification"
            >
              <q-tooltip>Restart verification after reconnecting the fingerprint reader</q-tooltip>
            </q-btn>
            <q-btn
              color="pink-7"
              icon="fingerprint"
              label="Verify Fingerprint"
              unelevated
              :loading="starting"
              :disable="isRunning || !isElectron"
              @click="startVerification"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const starting = ref(false)
const restarting = ref(false)
const isRunning = ref(false)
const verificationMessage = ref('')
const isElectron = typeof window !== 'undefined' && Boolean(window.fingerprintVerification)
let verificationSocket
let connectionRetry
let resultResetTimer

const statusMessage = computed(() => {
  if (!isElectron) return 'Fingerprint verification is available in the desktop app.'
  if (verificationMessage.value) return verificationMessage.value
  return isRunning.value ? 'Verification service is running.' : 'Verification service is not running.'
})

async function refreshStatus () {
  if (!isElectron) return
  isRunning.value = await window.fingerprintVerification.isRunning()
}

function connectToVerificationEvents (retriesRemaining = 10) {
  if (verificationSocket?.readyState === WebSocket.OPEN || verificationSocket?.readyState === WebSocket.CONNECTING) return

  verificationSocket = new WebSocket('ws://127.0.0.1:8092')
  verificationSocket.onopen = () => {
    verificationMessage.value = 'Waiting for a fingerprint scan.'
  }
  verificationSocket.onmessage = (event) => {
    let result
    try {
      result = JSON.parse(event.data)
    } catch {
      return
    }

    if (result.type !== 'verification') return

    console.log('Fingerprint attendance verification:', result)
    verificationMessage.value = result.message || (result.verified ? `Fingerprint verified for ${result.name}.` : 'Fingerprint did not match.')
    $q.notify({
      type: result.verified ? 'positive' : 'negative',
      message: verificationMessage.value
    })
    window.clearTimeout(resultResetTimer)
    resultResetTimer = window.setTimeout(() => {
      verificationMessage.value = 'Waiting for a fingerprint scan.'
    }, 2000)
  }
  verificationSocket.onclose = () => {
    verificationSocket = undefined
    if (retriesRemaining > 0) {
      connectionRetry = window.setTimeout(() => connectToVerificationEvents(retriesRemaining - 1), 500)
    }
  }
}

async function startVerification () {
  starting.value = true
  try {
    await window.fingerprintVerification.start()
    await refreshStatus()
    verificationMessage.value = 'Starting fingerprint verification...'
    connectToVerificationEvents()
    $q.notify({ type: 'positive', message: 'Fingerprint verification started.' })
  } catch (error) {
    console.error('Could not start fingerprint verification:', error)
    $q.notify({ type: 'negative', message: 'Could not start fingerprint verification.' })
  } finally {
    starting.value = false
  }
}

async function restartVerification () {
  restarting.value = true
  verificationSocket?.close()
  verificationSocket = undefined
  window.clearTimeout(connectionRetry)
  try {
    verificationMessage.value = 'Restarting fingerprint verification...'
    await window.fingerprintVerification.restart()
    await refreshStatus()
    connectToVerificationEvents()
    $q.notify({ type: 'positive', message: 'Fingerprint verification restarted.' })
  } catch (error) {
    console.error('Could not restart fingerprint verification:', error)
    $q.notify({ type: 'negative', message: 'Could not restart fingerprint verification.' })
  } finally {
    restarting.value = false
  }
}

onMounted(() => {
  refreshStatus()
  if (isElectron) connectToVerificationEvents()
})

onBeforeUnmount(() => {
  window.clearTimeout(connectionRetry)
  window.clearTimeout(resultResetTimer)
  verificationSocket?.close()
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
  max-width: 720px;
  border: 1px solid rgba(233, 30, 140, 0.15);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.1);
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