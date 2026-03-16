// Import the functions you need from the SDKs you need
import { boot } from 'quasar/wrappers';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { useAuthStore } from 'stores/auth.store';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const AUTH_LISTENER_UNSUBSCRIBE_KEY = '__authFirebaseListenerUnsubscribe__';
const AUTH_LISTENER_ID_KEY = '__authFirebaseListenerId__';

let hasResolvedAuthReady = false;
let resolveAuthReady = () => {};
const authReady = new Promise((resolve) => {
  resolveAuthReady = resolve;
});

const logAuth = (...messages) => {
  if (!process.env.DEV) return;
  console.info('[auth]', ...messages);
};

export { auth, db, authReady };

export default boot(() => {
  const authStore = useAuthStore();
  const globalScope = globalThis;

  if (typeof globalScope[AUTH_LISTENER_ID_KEY] !== 'number') {
    globalScope[AUTH_LISTENER_ID_KEY] = 0;
  }

  // Guard against duplicate listeners across HMR/restarts.
  if (typeof globalScope[AUTH_LISTENER_UNSUBSCRIBE_KEY] === 'function') {
    logAuth('Existing listener found. Unsubscribing before re-attaching.');
    globalScope[AUTH_LISTENER_UNSUBSCRIBE_KEY]();
  }

  const listenerId = globalScope[AUTH_LISTENER_ID_KEY] + 1;
  globalScope[AUTH_LISTENER_ID_KEY] = listenerId;

  logAuth(`Attaching auth state listener #${listenerId}.`);

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    const identity = user ? `uid=${user.uid}` : 'no authenticated user';
    logAuth(`Listener #${listenerId} fired: ${identity}.`);

    await authStore.syncAuthState(user);

    if (!hasResolvedAuthReady) {
      hasResolvedAuthReady = true;
      logAuth('Initial auth check completed.');
      resolveAuthReady();
    }
  });

  globalScope[AUTH_LISTENER_UNSUBSCRIBE_KEY] = () => {
    logAuth(`Detaching auth state listener #${listenerId}.`);
    unsubscribe();
    globalScope[AUTH_LISTENER_UNSUBSCRIBE_KEY] = null;
  };

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (typeof globalScope[AUTH_LISTENER_UNSUBSCRIBE_KEY] === 'function') {
        globalScope[AUTH_LISTENER_UNSUBSCRIBE_KEY]();
      }
    });
  }
});
