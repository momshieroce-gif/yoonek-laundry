<template>
  <q-page class="q-pa-lg">
    <div class="row justify-center">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card>
          <q-card-section>
            <div class="text-h5">Fingerprint Attendance</div>
            <div class="text-caption text-grey-7 q-mt-sm">
              Start the HTTP fingerprint bridge, then scan once to verify a saved fingerprint.
            </div>
          </q-card-section>

          <q-separator />

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn
              color="primary"
              icon="fingerprint"
              label="Verify fingerprint"
              :loading="scanning"
              :disable="scanning"
              @click="verifyFingerprint"
            />
          </q-card-actions>

          <q-card-section v-if="message" class="q-pt-none">
            <q-banner :class="verified ? 'bg-positive text-white' : 'bg-grey-2'">
              {{ message }}
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'

const BRIDGE_URL = 'http://localhost:8091'
const message = ref('')
const verified = ref(false)
const scanning = ref(false)

async function verifyFingerprint() {
  scanning.value = true
  message.value = 'Waiting for one fingerprint scan...'
  verified.value = false

  try {
    const response = await fetch(`${BRIDGE_URL}/api/verify-saved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeoutMs: 30000
      })
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || `Bridge returned HTTP ${response.status}`)
    }

    verified.value = result.verified === true
    message.value = result.verified
      ? `Verified: ${result.name || 'saved fingerprint'} (${result.templateFile})`
      : result.message || 'Fingerprint did not match.'
    console.log('Fingerprint verification result:', {
      filename: result.templateFile,
      name: result.name,
      ...result
    })
  } catch (error) {
    message.value = error.message.includes('Failed to fetch')
      ? 'Cannot reach the fingerprint HTTP bridge. Run fingerprint-bridge\\run.bat, not run-desktop.bat.'
      : error.message
    console.error('Fingerprint verification failed:', error)
  } finally {
    scanning.value = false
  }
}
</script>