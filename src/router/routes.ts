import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }],
    meta: { requiresAuth: true },
  },
  {
    path: '/audits',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'audit-page',
        component: () => import('pages/AuditPage.vue'),
      },
    ],
    meta: { requiresAuth: true },
  },
  {
    path: '/audits/history',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'audit-history',
        component: () => import('pages/AuditHistoryPage.vue'),
      },
    ],
    meta: { requiresAuth: true },
  },

  {
    path: '/login',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/LoginPage.vue') }],
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
