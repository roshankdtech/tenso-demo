import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { roleHome, useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import PortalPickerView from '@/views/PortalPickerView.vue'
import PasswordView from '@/views/PasswordView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import MyOrdersView from '@/views/warehouse/MyOrdersView.vue'
import DraftsView from '@/views/warehouse/DraftsView.vue'
import LatestView from '@/views/warehouse/LatestView.vue'
import OrderFormView from '@/views/OrderFormView.vue'
import OrderDetailView from '@/views/OrderDetailView.vue'
import PendingView from '@/views/approver/PendingView.vue'
import ReceivedView from '@/views/approver/ReceivedView.vue'
import SendLogView from '@/views/SendLogView.vue'
import CsvSpecView from '@/views/CsvSpecView.vue'
import BillingView from '@/views/BillingView.vue'
import ItemsView from '@/views/admin/ItemsView.vue'
import DestinationsView from '@/views/admin/DestinationsView.vue'
import AccountsView from '@/views/admin/AccountsView.vue'
import MailOutboxView from '@/views/admin/MailOutboxView.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: PortalPickerView, meta: { loginPage: true } },
  {
    path: '/login/:role(warehouse|approver|admin)',
    name: 'login-role',
    component: LoginView,
    props: (route) => ({ role: route.params.role }),
    meta: { loginPage: true },
  },
  {
    path: '',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      // 倉庫 (warehouse staff)
      { path: '/orders', name: 'orders', component: MyOrdersView, meta: { roles: ['warehouse'] } },
      {
        path: '/orders/new',
        name: 'order-new',
        component: OrderFormView,
        meta: { roles: ['warehouse'] },
      },
      {
        path: '/orders/:no/edit',
        name: 'order-edit',
        component: OrderFormView,
        meta: { roles: ['warehouse'] },
      },
      { path: '/drafts', name: 'drafts', component: DraftsView, meta: { roles: ['warehouse'] } },
      { path: '/latest', name: 'latest', component: LatestView, meta: { roles: ['warehouse'] } },

      // 承認者 (tenso approver)
      {
        path: '/proxy',
        name: 'proxy-order',
        component: OrderFormView,
        meta: { roles: ['approver'] },
      },
      { path: '/pending', name: 'pending', component: PendingView, meta: { roles: ['approver'] } },
      {
        path: '/received',
        name: 'received',
        component: ReceivedView,
        meta: { roles: ['approver'] },
      },

      // 承認者・管理者 (shared)
      {
        path: '/sendlog',
        name: 'sendlog',
        component: SendLogView,
        meta: { roles: ['approver', 'admin'] },
      },
      {
        path: '/csv-spec',
        name: 'csv-spec',
        component: CsvSpecView,
        meta: { roles: ['approver', 'admin'] },
      },
      {
        path: '/billing',
        name: 'billing',
        component: BillingView,
        meta: { roles: ['approver', 'admin'] },
      },

      // 管理者 (Kumon admin)
      { path: '/items', name: 'items', component: ItemsView, meta: { roles: ['admin'] } },
      {
        path: '/destinations',
        name: 'destinations',
        component: DestinationsView,
        meta: { roles: ['admin'] },
      },
      { path: '/accounts', name: 'accounts', component: AccountsView, meta: { roles: ['admin'] } },
      { path: '/mail', name: 'mail', component: MailOutboxView },

      // Shared detail page for any order (role checks happen on the API).
      {
        path: '/orders/:no',
        name: 'order-detail',
        component: OrderDetailView,
      },
      // Any signed-in user can change their own password.
      { path: '/password', name: 'password', component: PasswordView },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Route guards: session check, login requirement, and role checks.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.restore()

  if (to.meta.loginPage) {
    return auth.role ? roleHome[auth.role] : true
  }

  const needsLogin = to.matched.some((r) => r.meta.requiresAuth)
  if (needsLogin && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const allowed = to.matched.find((r) => r.meta.roles)?.meta.roles
  if (allowed && auth.role && !allowed.includes(auth.role)) {
    return roleHome[auth.role]
  }
  return true
})

export default router
