import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/auditor',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'auditor-home', component: () => import('pages/AuditorPage.vue') },
    ],
    meta: { requiresAuth: true, allowedRoles: ['operator', 'admin'] },
  },
  {
    path: '/admin',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'admin-home', component: () => import('pages/AdminPage.vue') },
      {
        path: 'analytics',
        name: 'analytics',
        component: () => import('pages/AnalyticsPage.vue'),
      },
    ],
    meta: { requiresAuth: true, allowedRoles: ['admin'] },
  },
  {
    path: '/audits',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'rto-board5s',
        name: 'rto-board5s-page',
        component: () => import('pages/AuditPage.vue'),
      },
      {
        path: 'daily-5s',
        name: 'daily5s-audit-page',
        component: () => import('pages/Daily5sAuditPage.vue'),
      },
      {
        path: 'audit-history',
        name: 'audit-history',
        component: () => import('pages/AuditHistoryPage.vue'),
      },
    ],
    meta: { requiresAuth: true, allowedRoles: ['operator', 'admin'] },
  },
  {
    path: '/login',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', name: 'login', component: () => import('pages/LoginPage.vue') }],
    meta: { guestOnly: true },
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
    meta: { public: true },
  },
];

export default routes;
