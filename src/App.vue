<template>
  <router-view />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { auth, onAuthStateChanged } from './boot/firebase'
import { useUserStore } from './stores/user'

let unsubscribe = null

onMounted(() => {
  const userStore = useUserStore()
  unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      userStore.setUser(user)
    } else {
      userStore.clearUser()
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>
