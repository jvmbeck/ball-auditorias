import { auth } from 'boot/firebase';

import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

export const login = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  return signOut(auth);
};
