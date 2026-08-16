// Client for the local DigitalPersona fingerprint bridge (native app in fingerprint-bridge-c/).
// The bridge runs on the same machine as the fingerprint reader and exposes a small HTTP API.
import axios from 'axios'

const BRIDGE_URL = process.env.FINGERPRINT_BRIDGE_URL || 'http://localhost:8091'

const bridge = axios.create({ baseURL: BRIDGE_URL, timeout: 65000 })

export async function getBridgeStatus() {
  const { data } = await bridge.get('/api/status')
  return data
}

// Blocks until enough fingerprint scans are captured (or timeout), returns a base64 template.
export async function enrollFingerprint(timeoutMs = 60000) {
  const { data } = await bridge.post('/api/enroll', { timeoutMs })
  return data
}

// Blocks until a fingerprint scan is captured (or timeout) and compares it with the stored template.
export async function verifyFingerprint(template, timeoutMs = 30000) {
  const { data } = await bridge.post('/api/verify', { template, timeoutMs })
  return data
}
