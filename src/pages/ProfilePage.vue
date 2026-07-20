<template>
  <q-page class="q-pa-md">
    <div class="text-h4 text-weight-bold q-mb-md">Profile</div>
    <div class="text-body1 text-grey-6 q-mb-xl">Manage your account settings</div>

    <q-card class="q-pa-md">
      <q-card-section>
        <div class="row items-center q-mb-xl">
          <div class="col-12 col-sm-4 text-center">
            <q-avatar size="150px" color="primary" text-color="white">
              <q-icon name="person" size="5rem" v-if="!userStore.user?.photoURL" />
              <img :src="userStore.user?.photoURL" v-else />
            </q-avatar>
          </div>
          <div class="col-12 col-sm-8 q-pl-md">
            <div class="text-h5 text-weight-bold q-mb-sm">
              {{ userStore.userData?.displayName || userStore.user?.displayName || 'User' }}
            </div>
            <div class="text-body1 text-grey-6 q-mb-sm">
              {{ userStore.user?.email }}
            </div>
            <q-badge :color="userStore.isAdmin ? 'accent' : 'secondary'" class="text-subtitle2">
              {{ userStore.userData?.role?.toUpperCase() || 'STAFF' }}
            </q-badge>
          </div>
        </div>

        <q-separator class="q-mb-xl" />

        <q-form @submit="handleUpdateProfile" class="q-gutter-md">
          <div class="row q-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="profileForm.displayName"
                label="Display Name"
                outlined
                dense
              >
                <template v-slot:prepend>
                  <q-icon name="person" />
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
              >
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model="profileForm.phone"
                label="Phone Number"
                outlined
                dense
              >
                <template v-slot:prepend>
                  <q-icon name="phone" />
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
              >
                <template v-slot:prepend>
                  <q-icon name="store" />
                </template>
              </q-select>
            </div>
          </div>

          <div class="row justify-end q-mt-md">
            <q-btn
              type="submit"
              label="Update Profile"
              color="primary"
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
