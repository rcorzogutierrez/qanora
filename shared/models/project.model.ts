import { FirestoreTimestamp } from './firestore-timestamp';

/** projects/{projectId} */
export interface Project {
  accountId: string;
  name: string;
  isArchived: boolean;
  gaMeasurementId?: string;
  statsStartDate?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
