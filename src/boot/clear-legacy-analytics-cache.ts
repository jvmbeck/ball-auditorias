import { boot } from 'quasar/wrappers';

const CACHE_KEY = 'analytics-dashboard-cache-v3';
const MIGRATION_KEY = 'analytics-dashboard-cache-v3-removed';

export default boot(() => {
  if (localStorage.getItem(MIGRATION_KEY)) {
    return;
  }

  localStorage.removeItem(CACHE_KEY);
  localStorage.setItem(MIGRATION_KEY, 'true');
});
