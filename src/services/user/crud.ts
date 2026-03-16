import { doc, getDoc } from 'firebase/firestore';
import { db } from 'boot/firebase';
import type { UserProfile } from 'src/types/user';

/**
 * Fetches the Firestore user profile associated with a Firebase Auth UID.
 *
 * The profile contains application-level metadata (role)
 * that is not stored in Firebase Authentication.
 *
 * @param uid Firebase Authentication user ID
 * @returns The user's profile document or null if it does not exist
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);

  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}
