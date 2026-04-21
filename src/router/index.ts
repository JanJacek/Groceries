import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import SettingsView from '@/views/SettingsView.vue'
import ContactsView from '@/views/ContactsView.vue'
import TermsView from '@/views/TermsView.vue'
import PrivacyView from '@/views/PrivacyView.vue'
import { useAuthStore } from '@/stores/auth'
import { useShoppingStore } from '@/stores/shopping'
import type { RouteLocationRaw } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/lists',
      redirect: '/',
    },
    {
      path: '/lists/:listId',
      name: 'list-detail',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { guestOnly: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: ContactsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/terms',
      name: 'terms',
      component: TermsView,
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: PrivacyView,
    },
    {
      path: '/cash',
      redirect: '/',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

const resolveDefaultAuthenticatedPath = async (): Promise<RouteLocationRaw> => {
  const shopping = useShoppingStore()
  await shopping.loadLists({ silent: true, reloadSelected: false })
  const targetListId = shopping.activeLists[0]?.id

  if (targetListId) return { path: `/lists/${targetListId}` }
  if (shopping.pendingLists.length) return { path: '/' }
  return { path: '/', query: { mode: 'new-list' } }
}

const isRootWithoutMode = (target: RouteLocationRaw) =>
  typeof target === 'object' && 'path' in target && target.path === '/' && !target.query?.mode

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initialize()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login' }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return await resolveDefaultAuthenticatedPath()
  }

  if (auth.isAuthenticated && (to.path === '/' || to.path === '/lists')) {
    const target = await resolveDefaultAuthenticatedPath()
    if (!isRootWithoutMode(target)) {
      return target
    }
    return true
  }

  if (auth.isAuthenticated && to.name === 'list-detail' && typeof to.params.listId === 'string') {
    const shopping = useShoppingStore()
    await shopping.loadLists({ silent: true, reloadSelected: false })
    const targetList = shopping.lists.find((list) => list.id === to.params.listId)

    if (targetList?.accessStatus === 'pending') {
      return await resolveDefaultAuthenticatedPath()
    }
  }

  return true
})

export default router
