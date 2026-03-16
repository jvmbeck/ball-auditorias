export interface UserProfile {
  name: string;
  role: 'operator' | 'admin';
  active: boolean;
}
