<template>
  <q-layout view="lHh lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat round dense icon="menu" @click="toggleLeftDrawer" />
        <q-toolbar-title class="text-weight-bold">
          <q-icon name="local_laundry_service" class="q-mr-sm" />
          Yoonek Laundry
        </q-toolbar-title>
        <q-btn flat round dense icon="account_circle" @click="navigateToProfile">
          <q-tooltip>Profile</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="logout" @click="handleLogout" class="q-ml-sm">
          <q-tooltip>Logout</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="dashboard-sidebar"
      :width="250"
    >
      <q-list>
        <q-item-label header class="text-white text-subtitle1 text-weight-bold q-pa-md">
          Navigation
        </q-item-label>

        <q-item
          clickable
          v-ripple
          @click="navigateTo('dashboard')"
          :class="isActiveRoute('dashboard') ? 'bg-white text-primary' : 'text-white'"
        >
          <q-item-section avatar>
            <q-icon :name="isActiveRoute('dashboard') ? 'dashboard' : 'dashboard'" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="navigateTo('branches')"
          :class="isActiveRoute('branches') ? 'bg-white text-primary' : 'text-white'"
        >
          <q-item-section avatar>
            <q-icon name="store" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Branches</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="navigateTo('sales')"
          :class="isActiveRoute('sales') ? 'bg-white text-primary' : 'text-white'"
        >
          <q-item-section avatar>
            <q-icon name="point_of_sale" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Sales</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="navigateTo('inventory')"
          :class="isActiveRoute('inventory') ? 'bg-white text-primary' : 'text-white'"
        >
          <q-item-section avatar>
            <q-icon name="inventory_2" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Inventory</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="navigateToProfile"
          :class="isActiveRoute('profile') ? 'bg-white text-primary' : 'text-white'"
        >
          <q-item-section avatar>
            <q-icon name="person" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Profile</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container class="dashboard-content">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from '../boot/firebase'
import { useUserStore } from '../stores/user'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const leftDrawerOpen = ref(true)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function navigateTo(path) {
  router.push(`/dashboard/${path}`)
}

function navigateToProfile() {
  router.push('/dashboard/profile')
}

function isActiveRoute(path) {
  return route.path.includes(path)
}

async function handleLogout() {
  $q.dialog({
    title: 'Logout',
    message: 'Are you sure you want to logout?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await signOut(auth)
      userStore.clearUser()
      router.push('/login')
      $q.notify({
        type: 'positive',
        message: 'Logged out successfully'
      })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Logout failed: ' + error.message
      })
    }
  })
}
</script>
