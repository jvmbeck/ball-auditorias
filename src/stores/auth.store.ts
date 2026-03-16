import { defineStore } from 'pinia';
import { ref, computed, type Ref } from 'vue';
import type { User } from 'firebase/auth';
import { getUserProfile } from 'src/services/user/index';
import { login, logout } from 'src/services/auth/index';
import type { UserProfile } from 'src/types/user';

export const useAuthStore = defineStore('auth', () => {
  const firebaseUser: Ref<User | null> = ref(null);
  const profile: Ref<UserProfile | null> = ref(null);
  const initialized = ref(false);

  const loading = ref(false);
  const authError = ref<string | null>(null);

  const isAuthenticated = computed(() => !!firebaseUser.value);
  const role = computed(() => profile.value?.role);

  async function syncAuthState(user: User | null) {
    firebaseUser.value = user;
    authError.value = null;

    try {
      if (user) {
        profile.value = await getUserProfile(user.uid);
      } else {
        profile.value = null;
      }
    } catch (err: unknown) {
      profile.value = null;
      authError.value = err instanceof Error ? err.message : String(err);
    }

    initialized.value = true;
  }

  async function loginUser(email: string, password: string) {
    loading.value = true;
    authError.value = null;

    try {
      await login(email, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        authError.value = err.message;
      } else {
        authError.value = String(err);
      }
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logoutUser() {
    await logout();
  }

  return {
    firebaseUser,
    profile,
    initialized,
    isAuthenticated,
    role,
    loading,
    authError,
    loginUser,
    logoutUser,
    syncAuthState,
  };
});
