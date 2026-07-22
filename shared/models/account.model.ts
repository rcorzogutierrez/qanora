import { FirestoreTimestamp } from './firestore-timestamp';

export type AccountPlan = 'trial' | 'free' | 'basic' | 'pro' | 'enterprise';
export type Language = 'es' | 'en';

export interface CompanyProfile {
  logoPath?: string;
  industry?: string;
  size?: string;
  city?: string;
  country?: string;
  phone?: string;
}

/** accounts/{accountId} */
export interface Account {
  name: string;
  createdAt: FirestoreTimestamp;
  plan: AccountPlan;
  trialEndsAt: FirestoreTimestamp;
  stripeCustomerId?: string;
  codesCount: number;
  timeZone: string;
  language: Language;
  companyProfile?: CompanyProfile;
}
