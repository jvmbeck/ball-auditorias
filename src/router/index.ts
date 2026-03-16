import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useAuthStore } from 'src/stores/auth.store';
import { authReady } from 'boot/firebase';

const AUTH_INIT_TIMEOUT_MS = 8000;

const waitForAuthInitialization = async () => {
  await Promise.race([
    authReady,
    new Promise((resolve) => {
      setTimeout(resolve, AUTH_INIT_TIMEOUT_MS);
    }),
  ]);
};

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to) => {
    const authStore = useAuthStore();

    // Wait until Firebase auth state has been resolved
    if (!authStore.initialized) {
      await waitForAuthInitialization();

      if (!authStore.initialized && process.env.DEV) {
        console.warn('[auth] Timed out waiting for auth initialization during navigation.');
      }
    }

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth === true);
    const guestOnly = to.matched.some((record) => record.meta.guestOnly === true);
    const isPublic = to.matched.some((record) => record.meta.public === true);

    // Block unauthenticated users from protected pages.
    if (!authStore.isAuthenticated && (requiresAuth || (!isPublic && !guestOnly))) {
      return '/login';
    }

    // Block authenticated users from guest-only pages.
    if (authStore.isAuthenticated && guestOnly) {
      return '/';
    }
  });

  return Router;
});
