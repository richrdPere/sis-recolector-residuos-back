const path =
  require('path');

const {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
} = require(
  'firebase-admin/app',
);

const {
  getMessaging,
} = require(
  'firebase-admin/messaging',
);

/*
|--------------------------------------------------------------------------
| Construir credencial
|--------------------------------------------------------------------------
*/

const getFirebaseCredential =
  () => {
    /*
     * Opción 1:
     *
     * GOOGLE_APPLICATION_CREDENTIALS contiene la ruta absoluta.
     */

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return applicationDefault();
    }

    /*
     * Opción 2:
     *
     * FIREBASE_CREDENTIALS_PATH contiene una ruta relativa
     * desde la raíz del proyecto.
     */

    const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH;

    if (!credentialsPath) {
      throw new Error(
        'No se configuraron las credenciales de Firebase Admin.',
      );
    }

    const absolutePath =
      path.resolve(
        process.cwd(),
        credentialsPath,
      );

    // eslint-disable-next-line global-require, import/no-dynamic-require
    const serviceAccount =
      require(absolutePath);

    return cert(
      serviceAccount,
    );
  };

/*
|--------------------------------------------------------------------------
| Inicializar Firebase Admin
|--------------------------------------------------------------------------
*/

const initializeFirebaseAdmin =
  () => {
    if (getApps().length) {
      return getApp();
    }

    const projectId =
      process.env
        .FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error(
        'La variable FIREBASE_PROJECT_ID no está configurada.',
      );
    }

    const firebaseApp =
      initializeApp({
        credential:
          getFirebaseCredential(),

        projectId,
      });

    console.log(
      `🔥 Firebase Admin conectado al proyecto ${projectId}`,
    );

    return firebaseApp;
  };

/*
|--------------------------------------------------------------------------
| Obtener Firebase Messaging
|--------------------------------------------------------------------------
*/

const getFirebaseMessaging =
  () => {
    const firebaseApp =
      initializeFirebaseAdmin();

    return getMessaging(
      firebaseApp,
    );
  };

module.exports = {
  initializeFirebaseAdmin,
  getFirebaseMessaging,
};