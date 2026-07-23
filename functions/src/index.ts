import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onUserCreate } from './auth/on-user-create';
export { redirect } from './redirect';
export { createQrCode } from './codes/create-code';
export { updateCodeDestination } from './codes/update-code-destination';
export { updateCodeStatus } from './codes/update-code-status';
export { updateCodeMeta } from './codes/update-code-meta';
