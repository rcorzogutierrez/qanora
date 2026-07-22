// Apunta a qanora-staging (no a producción) como red de seguridad: si alguien
// olvida conectar los emuladores, el peor caso es tocar staging, nunca prod.
export const environment = {
  production: false,
  useEmulators: true,
  redirectBaseUrl: 'http://127.0.0.1:5000',
  firebase: {
    projectId: 'qanora-staging',
    appId: '1:723494821454:web:319eae1ac51445f3c9ad1f',
    storageBucket: 'qanora-staging.firebasestorage.app',
    apiKey: 'AIzaSyD7jVBUtkSIS4ad1d_nG9qapcJUIhWmCo0',
    authDomain: 'qanora-staging.firebaseapp.com',
    messagingSenderId: '723494821454',
  },
};
