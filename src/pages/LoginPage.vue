<template>
  <q-page class="login-page">
    <!-- Decorative floating blobs -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>

    <div class="login-wrap row no-wrap">
      <!-- Left brand panel -->
      <div class="brand-panel col-7 flex items-end justify-center q-ml-md">
        <img src="logo.png" alt="Yoonek Laundry" class="brand-logo q-mb-lg" />
      </div>

      <!-- Right form panel -->
      <div class="form-panel col-5 flex flex-center">
        <div class="login-card">
          <div class="login-subtitle q-mb-lg">Sign in to your account</div>

          <q-form @submit="handleEmailLogin" class="q-gutter-md">
            <q-input
              v-model="email"
              label="Email"
              type="email"
              outlined
              dense
              class="login-input"
              :rules="[
                (val) => !!val || 'Email is required',
                (val) => isValidEmail(val) || 'Invalid email',
              ]"
            >
              <template v-slot:prepend>
                <q-icon name="email" color="pink-5" />
              </template>
            </q-input>

            <q-input
              v-model="password"
              label="Password"
              :type="showPassword ? 'text' : 'password'"
              outlined
              dense
              class="login-input"
              :rules="[(val) => !!val || 'Password is required']"
            >
              <template v-slot:prepend>
                <q-icon name="lock" color="pink-5" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>

            <q-btn
              type="submit"
              label="Sign In"
              rounded
              unelevated
              class="login-btn full-width q-py-sm q-mt-md"
              :loading="loading"
            />
          </q-form>
          <br />
          <div class="page-header q-mb-lg">
            <q-card class="verification-card">
              <q-card-section class="q-pa-lg">
                <div class="row items-center q-col-gutter-lg">
                  <div class="col-auto">
                    <q-icon
                      name="fingerprint"
                      size="3rem"
                      class="verification-icon"
                    />
                  </div>
                  <div class="col">
                    <div class="verification-title">
                      Fingerprint attendance
                    </div>
                    <div
                      class="verification-status"
                      :class="isRunning ? 'is-running' : ''"
                    >
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
                      <q-tooltip
                        >Restart verification after reconnecting the fingerprint
                        reader</q-tooltip
                      >
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
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from "vue-router";
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  signInWithEmailAndPassword,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "../boot/firebase";
import { useUserStore } from "../stores/user";

const $q = useQuasar();
const router = useRouter();
const userStore = useUserStore();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);

function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

async function handleEmailLogin() {
  if (!email.value || !password.value) {
    $q.notify({
      type: "warning",
      message: "Please fill in all fields",
    });
    return;
  }

  loading.value = true;
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.value,
      password.value,
    );
    await handleUserLogin(userCredential.user);
  } catch (error) {
    $q.notify({
      type: "negative",
      message: "Login failed: " + error.message,
    });
  } finally {
    loading.value = false;
  }
}

async function handleUserLogin(user) {
  try {
    // Check if user document exists
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Split Google display name into first/last name
      const nameParts = (user.displayName || "").trim().split(/\s+/);
      const firstName = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
      const lastName =
        nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

      // Create new user document (relationship: roleId -> roles/{roleId})
      await setDoc(userRef, {
        firstName,
        lastName,
        email: user.email,
        mobileNumber: user.phoneNumber || "",
        roleId: "staff", // Default role, references roles collection
        status: "active",
        avatarUrl: user.photoURL || "",
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
      });
    } else {
      // Existing user: record the login
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    }

    await userStore.setUser(user);
    $q.notify({
      type: "positive",
      message: "Login successful!",
    });
    router.push("/dashboard");
  } catch (error) {
    $q.notify({
      type: "negative",
      message: "Error setting up user: " + error.message,
    });
  }
}

function goToHome() {
  router.push("/");
}

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
  verificationSocket.onmessage = async (event) => {
    let result
    try {
      result = JSON.parse(event.data)
    } catch {
      return
    }

    if (result.type !== 'verification') return

    console.log('Fingerprint attendance verification:', result)
    verificationMessage.value = result.message || (result.verified ? `Fingerprint verified for ${result.name}.` : 'Fingerprint did not match.')
    
    if (result.verified) {
      const logType = await recordAttendance(result.name, result.file)
      const logTypeSuffix = logType ? ` (${logType})` : ''
      $q.notify({
        type: result.verified ? 'positive' : 'negative',
        message: verificationMessage.value + logTypeSuffix
      })
    }
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

// Midnight-to-midnight boundaries in Philippine time (UTC+8), expressed as UTC Date instants for Firestore range queries.
function getPhilippineDayRange () {
  const PH_OFFSET_MS = 8 * 60 * 60 * 1000
  const phNow = new Date(Date.now() + PH_OFFSET_MS)
  const phMidnightUtcMs = Date.UTC(phNow.getUTCFullYear(), phNow.getUTCMonth(), phNow.getUTCDate())
  const startUtc = new Date(phMidnightUtcMs - PH_OFFSET_MS)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)
  return { startUtc, endUtc }
}

async function getLatestRatePerHour (attendanceRef, name) {
  const snapshot = await getDocs(query(attendanceRef, where('name', '==', name)))
  const latestOutLog = snapshot.docs
    .map((docSnap) => docSnap.data())
    .filter((attendance) => attendance.logType === 'Out' && attendance.createdAt?.toDate)
    .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())[0]

  return Number(latestOutLog?.ratePerHour) || 0
}

// Alternates In/Out per person per Philippine calendar day: first scan of the day is In, then it toggles.
async function recordAttendance (name, file) {
  try {
    const { startUtc, endUtc } = getPhilippineDayRange()
    const attendanceRef = collection(db, 'attendance')
    const todayQuery = query(
      attendanceRef,
      where('name', '==', name),
      where('createdAt', '>=', startUtc),
      where('createdAt', '<', endUtc),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
    const snapshot = await getDocs(todayQuery)
    let logType = 'In'
    let noOfHours = 0
    const ratePerHour = await getLatestRatePerHour(attendanceRef, name)
    if (!snapshot.empty) {
      const latestLog = snapshot.docs[0].data()
      logType = latestLog.logType === 'In' ? 'Out' : 'In'
      if (logType === 'Out' && latestLog.createdAt?.toDate) {
        const elapsedMilliseconds = Math.max(0, Date.now() - latestLog.createdAt.toDate().getTime())
        noOfHours = Math.round((elapsedMilliseconds / (60 * 60 * 1000)) * 100) / 100
      }
    }
    await addDoc(attendanceRef, {
      name,
      file,
      logType,
      noOfHours,
      ratePerHour,
      createdAt: serverTimestamp()
    })
    return logType
  } catch (error) {
    console.error('Could not record attendance:', error)
    return null
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
/* ===== Desktop-only login page ===== */
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: radial-gradient(
      circle at 80% 20%,
      rgba(233, 30, 140, 0.18) 0%,
      transparent 45%
    ),
    radial-gradient(
      circle at 20% 80%,
      rgba(233, 30, 140, 0.14) 0%,
      transparent 45%
    ),
    linear-gradient(135deg, #e91e8c 0%, #c2185b 55%, #8a1557 100%);
}

/* ===== Floating blobs ===== */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

.blob-1 {
  width: 520px;
  height: 520px;
  top: -180px;
  right: -120px;
  background: rgba(255, 255, 255, 0.12);
}

.blob-2 {
  width: 420px;
  height: 420px;
  bottom: -160px;
  left: -100px;
  background: rgba(255, 255, 255, 0.1);
}

/* ===== Two-panel layout ===== */
.login-wrap {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}

/* ===== Left brand panel ===== */
.brand-panel {
  flex-direction: column;
  justify-content: center;
  color: white;
}

.brand-content {
  width: 80%;
  max-width: 680px;
}

.brand-logo {
  width: 100%;
  height: auto;
  border-radius: 24px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.25),
    0 0 0 12px rgba(255, 255, 255, 0.15);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
}

.brand-logo:hover {
  transform: scale(1.02);
  box-shadow: 0 40px 90px rgba(0, 0, 0, 0.3),
    0 0 0 16px rgba(255, 255, 255, 0.2);
}

.brand-title {
  font-size: 3.2rem;
  font-weight: 900;
  letter-spacing: 4px;
  margin: 0;
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
}

.brand-tagline {
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  letter-spacing: 1px;
}

.brand-back-btn {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0.5px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 10px 24px;
}

.brand-back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* ===== Right form panel ===== */
.form-panel {
  padding: 60px 0px;
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: 52px 48px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 32px;
  box-shadow: 0 40px 90px rgba(0, 0, 0, 0.22);
}

/* ===== Headings ===== */
.login-title {
  font-size: 2rem;
  font-weight: 900;
  color: #4a2038;
  margin: 0;
  line-height: 1.2;
}

.login-subtitle {
  color: #8a4e71;
  font-size: 1rem;
}

/* ===== Inputs ===== */
.login-input :deep(.q-field__control) {
  border-radius: 14px;
}

.login-input :deep(.q-field__control::before) {
  border-color: rgba(233, 30, 140, 0.35);
}

.login-input :deep(.q-field--focused .q-field__control::after) {
  border-color: #e91e8c;
}

/* ===== Buttons ===== */
.login-btn {
  background: linear-gradient(135deg, #e91e8c 0%, #ff69b4 100%);
  color: white;
  font-weight: 700;
  font-size: 1rem;
  border-radius: 14px;
  box-shadow: 0 14px 40px rgba(233, 30, 140, 0.45);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.login-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 50px rgba(233, 30, 140, 0.55);
}

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
