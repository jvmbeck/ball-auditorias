import { defineStore } from 'pinia';
import { ref, computed, watch, type Ref } from 'vue';
import type { User } from 'firebase/auth';
import { getUserProfile } from 'src/services/user/index';
import { login, logout } from 'src/services/auth/index';
import type { UserProfile } from 'src/types/user';

export const useAuthStore = defineStore('auth', () => {
  const firebaseUser: Ref<User | null> = ref(null);
  const profile: Ref<UserProfile | null> = ref(null);

  const initialized = ref(false);
  const profileResolved = ref(false);

  const loading = ref(false);
  const authError = ref<string | null>(null);

  const isAuthenticated = computed(() => !!firebaseUser.value);
  const role = computed(() => profile.value?.role);

  // Tracks the currently running profile request.
  let profileResolutionPromise: Promise<void> | null = null;

  // Prevents older requests from overwriting newer authentication state.
  let profileRequestId = 0;

  async function syncAuthState(user: User | null) {
    const requestId = ++profileRequestId;

    firebaseUser.value = user;
    profile.value = null;
    authError.value = null;
    profileResolved.value = false;

    const resolution = Promise.resolve().then(async () => {
      try {
        if (user) {
          const userProfile = await getUserProfile(user.uid);

          // Ignore results from outdated requests.
          if (requestId === profileRequestId) {
            profile.value = userProfile;
          }
        }
      } catch (err: unknown) {
        if (requestId === profileRequestId) {
          profile.value = null;
          authError.value = err instanceof Error ? err.message : String(err);
        }
      } finally {
        if (requestId === profileRequestId) {
          profileResolved.value = true;
          initialized.value = true;
          profileResolutionPromise = null;
        }
      }
    });

    profileResolutionPromise = resolution;

    await resolution;
  }

  // Waits for the profile belonging to the requested user.
  async function waitForProfileResolution(expectedUid?: string) {
    // If login has completed but Firebase's listener hasn't updated
    // the store yet, wait until it detects the expected user.
    if (expectedUid && firebaseUser.value?.uid !== expectedUid) {
      await new Promise<void>((resolve) => {
        const stop = watch(
          firebaseUser,
          (user) => {
            if (user?.uid === expectedUid) {
              stop();
              resolve();
            }
          },
          { immediate: true },
        );
      });
    }

    if (profileResolved.value) {
      return;
    }

    if (profileResolutionPromise) {
      await profileResolutionPromise;
      return;
    }

    // Fallback if no profile request is currently running.
    if (firebaseUser.value) {
      await syncAuthState(firebaseUser.value);
    }
  }

  async function loginUser(email: string, password: string) {
    loading.value = true;
    authError.value = null;

    try {
      const userCredential = await login(email, password);

      // Wait for Firebase's listener to resolve this user's profile.
      await waitForProfileResolution(userCredential.user.uid);
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
    profileResolved,
    isAuthenticated,
    role,
    loading,
    authError,
    loginUser,
    logoutUser,
    syncAuthState,
    waitForProfileResolution,
  };
});
