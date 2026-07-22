import { FirestoreTimestamp } from './firestore-timestamp';

export type MemberRole = 'admin' | 'projectManager';

/** accounts/{accountId}/members/{uid} — id is the Auth uid */
export interface Member {
  email: string;
  displayName: string;
  role: MemberRole;
  /** projectManager: proyectos asignados; admin: todos (campo omitido) */
  projectIds?: string[];
  createdAt: FirestoreTimestamp;
}
