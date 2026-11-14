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

    // 1. Wait for Firebase's initial authentication check.
    if (!authStore.initialized) {
      await waitForAuthInitialization();
    }

    // 2. Read route metadata.
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth === true);

    const guestOnly = to.matched.some((record) => record.meta.guestOnly === true);

    const isPublic = to.matched.some((record) => record.meta.public === true);

    const allowedRoles = to.matched.reduce<string[]>((roles, record) => {
      const routeRoles = record.meta.allowedRoles;

      if (Array.isArray(routeRoles)) {
        return [...roles, ...routeRoles.map(String)];
      }

      return roles;
    }, []);

    // 3. Handle unauthenticated users.
    if (!authStore.isAuthenticated) {
      if (requiresAuth || (!isPublic && !guestOnly)) {
        return '/login';
      }

      return;
    }

    // 4. Wait for the authenticated user's profile.
    if (!authStore.profileResolved) {
      await authStore.waitForProfileResolution();
    }

    // 5. Validate the user's role.
    const role = authStore.role;

    if (role !== 'admin' && role !== 'operator') {
      if (to.path !== '/access-error') {
        return '/access-error';
      }

      return;
    }

    // 6. Determine the user's landing page.
    const landingPage = role === 'admin' ? '/admin' : '/auditor';

    // 7. Redirect authenticated users away from guest-only pages.
    if (to.path === '/' || guestOnly) {
      return landingPage;
    }

    // 8. Check route permissions.
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return landingPage;
    }

    return;
  });

  return Router;
});
