<template>
  <q-page class="login-page flex flex-center">
    <!-- Decorative floating blobs -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>

    <div class="login-card">
      <div class="text-center q-mb-lg">
        <div class="login-logo-wrap q-mb-md">
          <CustomLogo class="login-logo" />
        </div>
        <h1 class="login-title q-mb-xs">Welcome Back</h1>
        <div class="login-subtitle">
          Sign in to your Yoonek Laundry account
        </div>
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
          class="login-btn full-width q-py-sm"
          :loading="loading"
        />
      </q-form>

      <div class="divider-row q-my-md">
        <div class="divider-line"></div>
        <span class="divider-text">or</span>
        <div class="divider-line"></div>
      </div>

      <q-btn
        @click="handleGoogleLogin"
        label="Sign in with Google"
        rounded
        outline
        class="google-btn full-width q-py-sm"
        :loading="loading"
      >
        <template v-slot:prepend>
          <img src="https://www.google.com/favicon.ico" style="width: 20px; height: 20px" />
        </template>
      </q-btn>

      <div class="text-center q-mt-lg">
        <q-btn flat rounded icon="arrow_back" label="Back to Home" @click="goToHome" class="back-btn" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db, doc, getDoc, setDoc, updateDoc, serverTimestamp, googleProvider, signInWithPopup, signInWithEmailAndPassword } from '../boot/firebase'
import { useUserStore } from '../stores/user'
import { useQuasar } from 'quasar'
import CustomLogo from '../components/CustomLogo.vue'

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

async function handleGoogleLogin() {
  loading.value = true
  try {
    const result = await signInWithPopup(auth, googleProvider)
    await handleUserLogin(result.user)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Google login failed: ' + error.message
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
/* ===== Page base - matches LandingPage ===== */
.login-page {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 20%, rgba(233, 30, 140, 0.12) 0%, transparent 45%),
    radial-gradient(circle at 85% 75%, rgba(233, 30, 140, 0.10) 0%, transparent 45%),
    linear-gradient(160deg, #FFF5FA 0%, #FFE4F1 45%, #FDD3E8 100%);
}

/* ===== Floating blobs ===== */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
}

.blob-1 {
  width: 400px;
  height: 400px;
  top: -120px;
  right: -100px;
  background: rgba(233, 30, 140, 0.25);
}

.blob-2 {
  width: 320px;
  height: 320px;
  bottom: -120px;
  left: -120px;
  background: rgba(255, 105, 180, 0.28);
}

/* ===== Glass card ===== */
.login-card {
  position: relative;
  z-index: 1;
  width: 420px;
  max-width: 92vw;
  padding: 40px 36px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(233, 30, 140, 0.15);
  border-radius: 28px;
  box-shadow: 0 25px 60px rgba(233, 30, 140, 0.2);
}

/* ===== Logo ===== */
.login-logo-wrap {
  display: flex;
  justify-content: center;
}

.login-logo {
  width: 96px;
  height: 96px;
  filter: drop-shadow(0 10px 24px rgba(233, 30, 140, 0.3));
}

/* ===== Headings ===== */
.login-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: #4A2038;
  margin: 0;
  line-height: 1.2;
}

.login-subtitle {
  color: #8A4E71;
  font-size: 0.95rem;
}

/* ===== Buttons ===== */
.login-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  font-weight: 700;
  box-shadow: 0 10px 30px rgba(233, 30, 140, 0.35);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(233, 30, 140, 0.45);
}

.google-btn {
  color: #4A2038;
  border-color: rgba(233, 30, 140, 0.4);
  font-weight: 600;
}

.back-btn {
  color: #E91E8C;
  font-weight: 600;
}

/* ===== Divider ===== */
.divider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(233, 30, 140, 0.2);
}

.divider-text {
  color: #B07E9A;
  font-size: 0.85rem;
}

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 22px;
  }

  .login-logo {
    width: 80px;
    height: 80px;
  }

  .login-title {
    font-size: 1.5rem;
  }
}
</style>
