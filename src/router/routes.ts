import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', name: 'index', component: () => import('pages/IndexPage.vue') }],
    meta: { requiresAuth: true },
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
        path: 'daily-5s-heatmap',
        name: 'daily5s-heatmap-page',
        component: () => import('pages/Daily5sHeatmapPage.vue'),
      },
      {
        path: 'audit-history',
        name: 'audit-history',
        component: () => import('pages/AuditHistoryPage.vue'),
      },
    ],
    meta: { requiresAuth: true },
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
