<template>
  <q-layout view="lHh lpr lFf" class="dashboard-layout">
    <q-header class="dashboard-header" height-hint="64">
      <q-toolbar class="q-py-sm">
        <q-btn flat round dense icon="menu" @click="toggleLeftDrawer" class="text-pink-8" />
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
      class="dashboard-sidebar"
      :width="260"
    >
      <!-- Decorative blob inside sidebar -->
      <div class="sidebar-blob"></div>

      <div class="sidebar-brand q-pa-md">
        <q-icon name="local_laundry_service" size="2.2rem" class="sidebar-brand-icon" />
        <div>
          <div class="sidebar-brand-name text-weight-bold">YOONEK</div>
          <div class="sidebar-brand-sub">Laundry Admin</div>
        </div>
      </div>

      <q-list class="sidebar-nav">
        <q-item-label header class="sidebar-section-label text-uppercase">
          Menu
        </q-item-label>

        <q-item
          v-if="userStore.isAdmin"
          clickable
          v-ripple
          @click="navigateTo('dashboard')"
          :class="['sidebar-item', isActiveRoute('dashboard') ? 'active-item' : '']"
        >
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
           v-if="userStore.isAdmin"
          clickable
          v-ripple
          @click="navigateTo('branches')"
          :class="['sidebar-item', isActiveRoute('branches') ? 'active-item' : '']"
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
          :class="['sidebar-item', isActiveRoute('sales') ? 'active-item' : '']"
        >
          <q-item-section avatar>
            <q-icon name="point_of_sale" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Sales</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
         v-if="userStore.isAdmin"
          clickable
          v-ripple
          @click="navigateTo('sale-items')"
          :class="['sidebar-item', isActiveRoute('sale-items') ? 'active-item' : '']">
          <q-item-section avatar>
            <q-icon name="category" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Service Types</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="navigateTo('inventory')"
          :class="['sidebar-item', isActiveRoute('inventory') ? 'active-item' : '']"
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
          @click="navigateTo('inventory-transactions')"
          :class="['sidebar-item', isActiveRoute('inventory-transactions') ? 'active-item' : '']"
        >
          <q-item-section avatar>
            <q-icon name="inventory_2" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Inventory Transactions</q-item-label>
          </q-item-section>
        </q-item>
        
        <q-item
          v-if="userStore.isAdmin"
          clickable
          v-ripple
          @click="navigateTo('users')"
          :class="['sidebar-item', isActiveRoute('users') ? 'active-item' : '']"
        >
          <q-item-section avatar>
            <q-icon name="group" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Users</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="navigateToProfile"
          :class="['sidebar-item', isActiveRoute('profile') ? 'active-item' : '']"
        >
          <q-item-section avatar>
            <q-icon name="person" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Profile</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="navigateTo('attendance')"
          :class="['sidebar-item', isActiveRoute('attendance') ? 'active-item' : '']"
        >
          <q-item-section avatar>
            <q-icon name="fingerprint" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Attendance</q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          v-if="userStore.isAdmin"
          clickable
          v-ripple
          @click="navigateTo('cash-advances')"
          :class="['sidebar-item', isActiveRoute('cash-advances') ? 'active-item' : '']"
        >
          <q-item-section avatar>
            <q-icon name="account_balance_wallet" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Cash Advance</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <!-- User mini card at bottom -->
      <div class="user-card q-mx-md q-mb-md">
        <q-item clickable v-ripple @click="navigateToProfile">
          <q-item-section avatar>
            <q-avatar color="white" text-color="pink-8" icon="person" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-bold text-white">{{ userName }}</q-item-label>
            <q-item-label caption class="text-pink-2">{{ userRole }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-separator dark inset />
        <q-item clickable v-ripple @click="handleLogout" class="logout-item">
          <q-item-section avatar>
            <q-icon name="logout" color="white" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-white">Logout</q-item-label>
          </q-item-section>
        </q-item>
      </div>
    </q-drawer>

    <q-page-container class="dashboard-content">
      <router-view />
    </q-page-container>

    <q-dialog v-model="showLogoutDialog" persistent class="logout-dialog">
      <q-card class="logout-card">
        <q-card-section>
          <div class="text-h6 dialog-title">Logout</div>
          <div class="dialog-subtitle">Are you sure you want to logout?</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat rounded label="Cancel" v-close-popup class="cancel-btn" />
          <q-btn rounded unelevated label="Logout" class="logout-btn" @click="confirmLogout" />
        </q-card-actions>
      </q-card>
    </q-dialog>
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
const showLogoutDialog = ref(false)

const userName = computed(() => {
  return userStore.userData?.displayName || userStore.userData?.email || 'User'
})

const userRole = computed(() => {
  return userStore.userData?.roleId || ''
})

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
  const segments = route.path.split('/').filter(Boolean)
  const lastSegment = segments.pop()
  return lastSegment === path
}

function handleLogout() {
  showLogoutDialog.value = true
}

async function confirmLogout() {
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
}
</script>

<style scoped>
/* ===== Pink-majority dashboard layout ===== */
.dashboard-layout {
  background:
    radial-gradient(circle at 90% 10%, rgba(233, 30, 140, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 10% 90%, rgba(233, 30, 140, 0.08) 0%, transparent 40%),
    linear-gradient(135deg, #FFF5FA 0%, #FFE4F1 50%, #FDD3E8 100%);
}

/* ===== Glass header ===== */
.dashboard-header {
  background: rgba(255, 255, 255, 0.92) !important;
  backdrop-filter: blur(16px);
  box-shadow: 0 4px 28px rgba(233, 30, 140, 0.14);
  border-bottom: 1px solid rgba(233, 30, 140, 0.1);
}

.dashboard-header .q-toolbar__title {
  color: #4A2038;
  font-size: 1.2rem;
}

.dashboard-header .q-icon {
  color: #E91E8C;
}

.dashboard-header .q-btn {
  color: #4A2038;
  transition: all 0.2s ease;
}

.dashboard-header .q-btn:hover {
  background: rgba(233, 30, 140, 0.1);
  color: #E91E8C;
  transform: translateY(-1px);
}

/* ===== Pink sidebar ===== */
.dashboard-sidebar {
  background: linear-gradient(180deg, #E91E8C 0%, #C2185B 55%, #8A1557 100%) !important;
  box-shadow: 8px 0 34px rgba(233, 30, 140, 0.28);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.sidebar-blob {
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  top: -60px;
  right: -80px;
  background: rgba(255, 255, 255, 0.08);
  filter: blur(30px);
  pointer-events: none;
}

/* ===== Sidebar brand ===== */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  color: white;
  position: relative;
  z-index: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.sidebar-brand-icon {
  color: white;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2));
}

.sidebar-brand-name {
  font-size: 1.35rem;
  line-height: 1;
  letter-spacing: 1px;
}

.sidebar-brand-sub {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 1.5px;
}

/* ===== Navigation ===== */
.sidebar-nav {
  flex: 1;
  position: relative;
  z-index: 1;
  padding-top: 8px;
}

.sidebar-section-label {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.7rem;
  letter-spacing: 2px;
  padding: 16px 22px 8px;
}

.sidebar-item {
  border-radius: 14px;
  margin: 6px 16px;
  color: rgba(255, 255, 255, 0.82);
  transition: all 0.25s ease;
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.12);
  color: white;
  transform: translateX(6px);
}

.sidebar-item.active-item {
  background: white !important;
  color: #E91E8C !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  font-weight: 700;
}

.sidebar-item.active-item .q-icon {
  color: #E91E8C;
}

/* ===== User card ===== */
.user-card {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  backdrop-filter: blur(6px);
  position: relative;
  z-index: 1;
}

.logout-item {
  border-radius: 0 0 18px 18px;
  color: rgba(255, 255, 255, 0.9);
}

.logout-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* ===== Page content background ===== */
.dashboard-content {
  background: transparent;
}
</style>

<style>
.logout-card {
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(233, 30, 140, 0.12);
  box-shadow: 0 30px 70px rgba(233, 30, 140, 0.25);
  backdrop-filter: blur(16px);
}

.dialog-title {
  color: #4A2038;
  font-weight: 800;
  font-size: 1.5rem;
}

.dialog-subtitle {
  color: #8A4E71;
  font-size: 1rem;
  margin-top: 4px;
}

.cancel-btn {
  color: #8A4E71;
  font-weight: 600;
}

.logout-btn {
  background: linear-gradient(135deg, #E91E8C 0%, #FF69B4 100%);
  color: white;
  font-weight: 700;
  padding: 0 22px;
  box-shadow: 0 10px 28px rgba(233, 30, 140, 0.35);
}
</style>
