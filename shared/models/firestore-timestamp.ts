/**
 * Structural shape shared by `firebase/firestore` (client) and
 * `firebase-admin/firestore` (Functions) Timestamp classes.
 * Using this instead of importing either SDK's concrete class keeps
 * shared/models free of a hard dependency on client or admin package.
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
}
