# Qanora

SaaS de generación de códigos QR dinámicos/estáticos y códigos de barras, con trial de 14 días y planes de suscripción.

Para las convenciones del proyecto (modelo de datos, Security Rules, Reglas de Dominio) ver [CLAUDE.md](./CLAUDE.md). Para el roadmap y el estado de cada fase ver [PLAN.md](./PLAN.md).

## Stack

- **Frontend:** Angular 20 (standalone, signals), Tailwind CSS
- **Backend:** Firebase — Auth, Firestore, Cloud Functions (Node 20, TypeScript), Storage, Hosting
- **Generación de códigos:** `qr-code-styling` (QR), `bwip-js` (barcodes)

## Requisitos

- Node.js 20+ (Functions corre en Node 20; el entorno de desarrollo puede tener una versión más nueva, el emulador avisa pero funciona)
- Java (JRE 11+) — lo necesita el emulador de Firestore/Storage
- Cuenta de Firebase con acceso a los proyectos `qanora-prod` y `qanora-staging` (`firebase login`)

## Setup inicial

```bash
npm install
```

Esto instala las dependencias de la app Angular, del paquete compartido `shared/` y de `functions/` (son npm workspaces).

## Desarrollo local

Todo el desarrollo local corre contra los **emuladores de Firebase** — nunca contra producción. Se necesitan dos terminales:

```bash
# Terminal 1 — emuladores (Auth, Firestore, Functions, Storage, Hosting)
npm run emulators
```

```bash
# Terminal 2 — Angular dev server
npm start
```

Abrí `http://localhost:4200`. La UI del emulador queda en `http://127.0.0.1:4000`.

> **Importante:** usá siempre `npm run emulators` (= `firebase emulators:start --project staging`), nunca `firebase emulators:start` a secas — el entorno de desarrollo (`environment.development.ts`) espera el proyecto `qanora-staging`, y con `singleProjectMode` activado el comando sin `--project` levanta `qanora-prod` por defecto, lo que rompe la evaluación de Security Rules de forma críptica.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm start` | `ng serve` — dev server de Angular |
| `npm run emulators` | Emuladores de Firebase contra el proyecto `staging` |
| `npm run build` | Build de producción de Angular |
| `npm run build:functions` | Compila Cloud Functions (`tsc`) |
| `npm test` | Tests unitarios (Karma, modo watch) |
| `npm run test:ci` | Tests unitarios en modo headless (una corrida) |
| `npm run test:rules` | Tests de Security Rules contra el emulador de Firestore |
| `npm run ci` | Pipeline completo: build + functions + tests unitarios + tests de rules |

Antes de dar por terminada una tarea, correr `npm run ci` y que pase todo.

## Estructura

```
shared/models/       // interfaces TS del modelo de datos — única definición, la usan Angular y Functions
src/app/
  core/              // servicios singleton (auth, account, projects, codes, plan-limits)
  features/          // auth, dashboard, qr-editor
  shared/            // componentes y utilidades reutilizables
functions/src/
  auth/              // onUserCreate — crea account/member/project al registrarse
  redirect/          // motor de redirección de QRs dinámicos
  scans/             // registro de escaneos y stats
  codes/             // creación/edición de códigos
tests/rules/         // tests de Firestore Security Rules
```

Detalle completo de cada carpeta y las convenciones de nombres en [CLAUDE.md](./CLAUDE.md#estructura-del-proyecto-angular).

## Deploy

```bash
firebase deploy --project staging   # o --project production
```

El deploy corre `predeploy` de Functions (build de TypeScript) automáticamente. Los hosting targets (`app` → site `qanora-staging` / `qanora`) ya están configurados en `.firebaserc` y `firebase.json`.
