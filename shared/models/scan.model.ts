import { FirestoreTimestamp } from './firestore-timestamp';

/** codes/{codeId}/scans/{scanId} — crudo; solo escritura desde Functions */
export interface Scan {
  scannedAt: FirestoreTimestamp;
  country?: string;
  city?: string;
  deviceType?: string;
  os?: string;
  referrer?: string;
}
