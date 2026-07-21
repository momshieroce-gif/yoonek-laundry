<template>
  <q-page class="profile-page q-pa-md">
    <!-- Header -->
    <div class="page-header q-mb-lg">
      <div>
        <div class="page-title">Profile</div>
        <div class="page-subtitle">Manage your account settings</div>
      </div>
    </div>

    <q-card class="profile-card">
      <q-card-section>
        <!-- User info banner -->
        <div class="profile-banner row items-center q-mb-xl">
          <div class="col-12 col-sm-4 text-center">
            <q-avatar size="150px" class="profile-avatar">
              <q-icon name="person" size="5rem" class="avatar-icon" v-if="!userStore.user?.photoURL" />
              <img :src="userStore.user?.photoURL" v-else />
            </q-avatar>
          </div>
          <div class="col-12 col-sm-8 q-pl-md">
            <div class="profile-name">
              {{ userStore.userData?.displayName || userStore.user?.displayName || 'User' }}
            </div>
            <div class="profile-email">
              {{ userStore.user?.email }}
            </div>
            <q-badge rounded class="role-badge">
              {{ userStore.userData?.roleId?.toUpperCase() || 'STAFF' }}
            </q-badge>
          </div>
        </div>

        <q-separator class="q-mb-xl" color="pink-3" />

        <q-form @submit="handleUpdateProfile" class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="profileForm.displayName"
                label="Display Name"
                outlined
                dense
                class="profile-input"
              >
                <template v-slot:prepend>
                  <q-icon name="person" color="pink-5" />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model="profileForm.email"
                label="Email"
                outlined
                dense
                disable
                class="profile-input"
              >
                <template v-slot:prepend>
                  <q-icon name="email" color="pink-5" />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model="profileForm.phone"
                label="Phone Number"
                outlined
                dense
                class="profile-input"
              >
                <template v-slot:prepend>
                  <q-icon name="phone" color="pink-5" />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-sm-6">
              <q-select
                v-model="profileForm.branchId"
                label="Assigned Branch"
                :options="branchOptions"
                outlined
                dense
                emit-value
                map-options
                :disable="!userStore.isAdmin"
                class="profile-input"
              >
                <template v-slot:prepend>
                  <q-icon name="store" color="pink-5" />
                </template>
              </q-select>
            </div>
          </div>

          <div class="row justify-end q-mt-lg">
            <q-btn
              type="submit"
              rounded
              unelevated
              label="Update Profile"
              class="update-btn"
              :loading="loading"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { db, doc, updateDoc, getDocs, collection } from '../boot/firebase'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (!userStore.isAuthenticated) {
    router.push('/login')
  }
})

const loading = ref(false)
const branchOptions = ref([])

const profileForm = ref({
  displayName: '',
  email: '',
  phone: '',
  branchId: ''
})

async function loadBranches() {
  try {
    const snapshot = await getDocs(collection(db, 'branches'))
    branchOptions.value = snapshot.docs.map(doc => ({
      label: doc.data().name,
      value: doc.id
    }))
  } catch (error) {
    console.error('Error loading branches:', error)
  }
}

async function loadProfile() {
  if (userStore.userData) {
    profileForm.value = {
      displayName: userStore.userData.displayName || '',
      email: userStore.user?.email || '',
      phone: userStore.userData.phone || '',
      branchId: userStore.userData.branchId || ''
    }
  }
}

async function handleUpdateProfile() {
  loading.value = true
  try {
    await updateDoc(doc(db, 'users', userStore.user.uid), {
      displayName: profileForm.value.displayName,
      phone: profileForm.value.phone,
      branchId: profileForm.value.branchId,
      updatedAt: new Date()
    })

    await userStore.fetchUserData(userStore.user.uid)
    
    $q.notify({
      type: 'positive',
      message: 'Profile updated successfully!'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to update profile: ' + error.message
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadBranches()
  loadProfile()
})
</script>

<style scoped>
/* ===== Pink profile page ===== */
.profile-page {
  color: #4A2038;
}

.page-header {
  padding: 12px 4px;
}

.page-title {
  font-size: 2.2rem;
  font-weight: 900;
  color: #4A2038;
  line-height: 1.1;
}

.page-subtitle {
  font-size: 1rem;
  color: #8A4E71;
  margin-top: 4px;
}

.profile-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(233, 30, 140, 0.12);
  border-radius: 28px;
  box-shadow: 0 14px 40px rgba(233, 30, 140, 0.12);
  backdrop-filter: blur(8px);
  padding: 24px;
}

/* ===== Avatar ===== */
.profile-avatar {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  box-shadow: 0 14px 36px rgba(233, 30, 140, 0.35);
  border: 4px solid rgba(255, 255, 255, 0.6);
}

.avatar-icon {
  color: white;
}

.profile-banner {
  background: linear-gradient(135deg, rgba(233, 30, 140, 0.08) 0%, rgba(255, 105, 180, 0.08) 100%);
  border-radius: 22px;
  padding: 30px 20px;
}

.profile-name {
  font-size: 1.8rem;
  font-weight: 800;
  color: #4A2038;
  margin-bottom: 6px;
}

.profile-email {
  font-size: 1.05rem;
  color: #8A4E71;
  margin-bottom: 10px;
}

.role-badge {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 700;
}

/* ===== Inputs ===== */
.profile-input :deep(.q-field__control) {
  border-radius: 14px;
}

.profile-input :deep(.q-field__control::before) {
  border-color: rgba(233, 30, 140, 0.35);
}

.profile-input :deep(.q-field--focused .q-field__control::after) {
  border-color: #E91E8C;
}

/* ===== Update button ===== */
.update-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  font-weight: 700;
  padding: 0 26px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.35);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.update-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px rgba(233, 30, 140, 0.45);
}
</style>
