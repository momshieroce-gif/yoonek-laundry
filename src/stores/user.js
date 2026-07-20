import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../boot/firebase'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const userData = ref(null)
  const loading = ref(false)

  const isAdmin = computed(() => userData.value?.roleId === 'admin')
  const isStaff = computed(() => userData.value?.roleId === 'staff')
  const isAuthenticated = computed(() => !!user.value)

  async function setUser(firebaseUser) {
    user.value = firebaseUser
    await fetchUserData(firebaseUser.uid)
  }

  async function fetchUserData(uid) {
    try {
      loading.value = true
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        userData.value = userDoc.data()
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      loading.value = false
    }
  }

  function clearUser() {
    user.value = null
    userData.value = null
  }

  return {
    user,
    userData,
    loading,
    isAdmin,
    isStaff,
    isAuthenticated,
    setUser,
    fetchUserData,
    clearUser
  }
})
