import { route } from 'quasar/wrappers'
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router'
import { auth, db, doc, getDoc, onAuthStateChanged } from '../boot/firebase'
import routes from './routes'

// Waits for Firebase to resolve the current auth state (handles page refresh)
function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

export default route(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  Router.beforeEach(async (to, from, next) => {
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const adminOnly = to.matched.some((record) => record.meta.adminOnly)

    if (!requiresAuth) {
      next()
      return
    }

    const user = await getCurrentUser()
    if (user) {
      if (adminOnly) {
        const userSnapshot = await getDoc(doc(db, 'users', user.uid))
        if (userSnapshot.data()?.roleId !== 'admin') {
          next('/dashboard/profile')
          return
        }
      }
      next()
    } else {
      next('/login')
    }
  })

  return Router
})
