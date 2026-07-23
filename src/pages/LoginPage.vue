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
          <div class="login-subtitle q-mb-lg">
            Sign in to your account
          </div>

          <q-form @submit="handleEmailLogin" class="q-gutter-md">
            <q-input
              v-model="email"
              label="Email"
              type="email"
              outlined
              dense
              class="login-input"
              :rules="[val => !!val || 'Email is required', val => isValidEmail(val) || 'Invalid email']"
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
              :rules="[val => !!val || 'Password is required']"
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
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db, doc, getDoc, setDoc, updateDoc, serverTimestamp, signInWithEmailAndPassword } from '../boot/firebase'
import { useUserStore } from '../stores/user'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)

function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}

async function handleEmailLogin() {
  if (!email.value || !password.value) {
    $q.notify({
      type: 'warning',
      message: 'Please fill in all fields'
    })
    return
  }

  loading.value = true
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value)
    await handleUserLogin(userCredential.user)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Login failed: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

async function handleUserLogin(user) {
  try {
    // Check if user document exists
    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      // Split Google display name into first/last name
      const nameParts = (user.displayName || '').trim().split(/\s+/)
      const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0] || ''
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

      // Create new user document (relationship: roleId -> roles/{roleId})
      await setDoc(userRef, {
        firstName,
        lastName,
        email: user.email,
        mobileNumber: user.phoneNumber || '',
        roleId: 'staff', // Default role, references roles collection
        status: 'active',
        avatarUrl: user.photoURL || '',
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid
      })
    } else {
      // Existing user: record the login
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      })
    }

    await userStore.setUser(user)
    $q.notify({
      type: 'positive',
      message: 'Login successful!'
    })
    router.push('/dashboard')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error setting up user: ' + error.message
    })
  }
}

function goToHome() {
  router.push('/')
}
</script>

<style scoped>
/* ===== Desktop-only login page ===== */
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 80% 20%, rgba(233, 30, 140, 0.18) 0%, transparent 45%),
    radial-gradient(circle at 20% 80%, rgba(233, 30, 140, 0.14) 0%, transparent 45%),
    linear-gradient(135deg, #E91E8C 0%, #C2185B 55%, #8A1557 100%);
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
  box-shadow:
    0 30px 70px rgba(0, 0, 0, 0.25),
    0 0 0 12px rgba(255, 255, 255, 0.15);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
}

.brand-logo:hover {
  transform: scale(1.02);
  box-shadow:
    0 40px 90px rgba(0, 0, 0, 0.3),
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
  color: #4A2038;
  margin: 0;
  line-height: 1.2;
}

.login-subtitle {
  color: #8A4E71;
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
  border-color: #E91E8C;
}

/* ===== Buttons ===== */
.login-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
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
</style>
