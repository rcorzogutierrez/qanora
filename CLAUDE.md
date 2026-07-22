# CLAUDE.md — Qanora

Plataforma SaaS de generación de QR codes dinámicos/estáticos y códigos de barras, con trial de 14 días y planes de suscripción.

## Regla #0 — Proactividad obligatoria

Claude DEBE señalar inconsistencias sin que se le pida: nombres que no siguen las convenciones de este archivo, colecciones de Firestore fuera del modelo de datos, componentes que duplican lógica existente, o decisiones que contradicen las Reglas de Dominio. Si detectas una inconsistencia mientras trabajas en otra cosa, repórtala antes de continuar. Nunca "arregles en silencio" ni ignores deuda que se está acumulando.

## Stack

- **Frontend:** Angular 20 (standalone components, signals, control flow `@if/@for`), Tailwind CSS
- **Backend:** Firebase — Auth, Firestore, Cloud Functions (Node 20, TypeScript), Storage, Hosting
- **Generación de códigos:** `qr-code-styling` (QR), `bwip-js` (barcodes — cliente Y servidor, misma librería para consistencia)
- **Pagos (Fase 3):** Stripe vía extensión oficial "Run Payments with Stripe"
- **Utilidades:** `file-saver` (descargas), `jspdf` (export PDF), `archiver` (ZIP en Functions), `papaparse` (CSV en batch), `ua-parser-js` (metadata de escaneos)

## Idioma

- UI en **español** (mercado inicial LATAM), preparada con i18n desde el inicio (`@angular/localize` o transloco — decidir en Fase 1 y documentar aquí)
- Código, nombres de variables, colecciones y commits en **inglés**
- Comentarios en el código: inglés

## Arquitectura de propiedad: CUENTA, no usuario

DECISIÓN ESTRUCTURAL (no negociable sin migración planificada): todos los recursos pertenecen a una **cuenta** (`accountId`), no a un usuario (`ownerUid`). En el MVP, cada cuenta tiene exactamente un miembro (su creador, rol `admin`), por lo que el comportamiento es idéntico a propiedad individual. Pero en Fase 4 los equipos multiusuario (referencia: cuenta enterprise real con 6 usuarios y roles por proyecto) se implementan solo agregando miembros — sin tocar `codes`, `projects` ni Security Rules de recursos.

- Security Rules validan pertenencia vía `accounts/{accountId}/members/{uid}`
- NUNCA usar `request.auth.uid` directamente como dueño de un recurso; siempre resolver a `accountId`

## Convenciones de Firestore (INMUTABLES — no renombrar sin actualizar este archivo)

### Nombres
- Colecciones: **camelCase plural** → `accounts`, `projects`, `codes`, `scans`, `plans`
- Campos: **camelCase** → `accountId`, `trialEndsAt`, `shortSlug`
- IDs: autogenerados por Firestore, EXCEPTO `accounts/{accountId}/members/{uid}` (UID de Auth) y `shortSlugs/{slug}` (el slug como ID para lookup O(1))
- Timestamps: siempre `Timestamp` de Firestore, nunca strings ni millis. Sufijo `At` → `createdAt`, `updatedAt`, `expiresAt`
- Booleanos: prefijo `is`/`has` → `isActive`, `isArchived`, `hasCustomDomain`
- Enums como strings literales en minúscula → `'trial' | 'basic' | 'pro'`, `'qr' | 'barcode'`, `'active' | 'paused' | 'expired'`, `'admin' | 'projectManager'`

### Modelo de datos

```
accounts/{accountId}
  name, createdAt
  plan: 'trial' | 'free' | 'basic' | 'pro' | 'enterprise'
  trialEndsAt: Timestamp
  stripeCustomerId?: string
  codesCount: number              // contador desnormalizado, mantenido por Function
  timeZone: string                // IANA, ej. 'America/New_York' — SOLO presentación
  language: 'es' | 'en'
  companyProfile?: { logoPath?, industry?, size?, city?, country?, phone? }

accounts/{accountId}/members/{uid}
  email, displayName, role: 'admin' | 'projectManager'
  projectIds?: string[]           // projectManager: proyectos asignados; admin: todos
  createdAt

projects/{projectId}
  accountId: string
  name: string
  isArchived: boolean             // archivar, nunca borrar
  gaMeasurementId?: string        // GA4 del cliente; si existe, redirect reenvía eventos
  statsStartDate?: Timestamp      // stats se muestran desde esta fecha
  createdAt, updatedAt

codes/{codeId}
  accountId: string
  projectId: string               // OBLIGATORIO; el MVP crea un "Default project"
  createdByUid: string            // auditoría de quién lo creó
  type: 'qr' | 'barcode'
  status: 'active' | 'paused' | 'expired'
  scanCount: number               // desnormalizado, incrementado por Function de escaneo
  createdAt, updatedAt
  // Solo QR:
  qrMode: 'static' | 'dynamic'
  qrType: 'website' | 'vcard' | 'wifi' | 'whatsapp' | 'pdf' | 'menu'
  shortSlug?: string              // solo dynamic; INMUTABLE tras creación
  shortUrl?: string               // solo dynamic; URL completa con el dominio vigente AL CREAR; INMUTABLE
  destination?: string            // solo dynamic; editable
  design: { dotColor, bgColor, dotStyle, cornerStyle, logoPath? }
  // Solo barcode:
  symbology: 'code39' | 'code128' | 'ean13' | 'upca' | 'gs1-128'
  barcodeText: string
  barcodeOptions: { prefix, suffix, padZeros, uppercase, checksum,
                    barWidth, heightMm, sideMargin, showText, textSize }

codes/{codeId}/scans/{scanId}     // crudo; solo escritura desde Functions
  scannedAt, country?, city?, deviceType?, os?, referrer?

codes/{codeId}/statsDaily/{yyyy-mm-dd}   // agregados en UTC; FieldValue.increment()
  total: number
  byCountry: map, byDevice: map, byOs: map

shortSlugs/{slug}                 // índice inverso para redirección O(1)
  codeId, accountId, projectId, destination, status   // desnormalizado a propósito

plans/{planId}                    // configuración de límites, editable sin deploy
  maxDynamicCodes, maxScansPerMonth, maxDownloadPx, maxProjects,
  maxMembers, allowSvg, allowBatch, allowApi, allowGaForwarding,
  allowCustomDomain, statsHistoryDays
```

### Reglas de acceso
- El cliente NUNCA escribe en `scans`, `statsDaily` ni `shortSlugs` — solo Cloud Functions
- Security Rules validan membresía de cuenta (`exists(accounts/{accountId}/members/{uid})`) y, para `projectManager`, pertenencia del proyecto; las Functions revalidan en servidor. Nunca confiar solo en el cliente
- Lecturas del dashboard siempre filtradas por `accountId` (+ `projectId` si aplica) con índices compuestos

## Reglas de Dominio (invariantes del negocio)

1. **Un QR dinámico SIEMPRE codifica el short link (`{DOMAIN}/{slug}`), nunca el destino final.** Editar el destino no regenera el QR. Cualquier código que viole esto es un bug crítico.
2. **El slug Y la `shortUrl` son inmutables una vez creados.** El QR se renderiza SIEMPRE desde `codes.shortUrl` almacenada, nunca desde la configuración de dominio vigente. El dominio base (`REDIRECT_BASE_URL`, en environment/config) se usa SOLO al crear códigos nuevos. Esto garantiza que migrar de `qanora.web.app` a un dominio corto de pago no altere ningún QR existente: los códigos viejos siguen resolviendo por web.app (Firebase lo mantiene activo junto al dominio custom) y los nuevos usan el dominio nuevo.
3. **Nada se borra por expiración o limpieza: se pausa o se archiva.** Trial vencido → códigos dinámicos a `status: 'paused'` con página de reactivación. Proyectos → `isArchived: true`. Nunca destruir datos del cliente.
4. **Preview y servidor usan la misma librería de render** (`bwip-js` en ambos). Si el batch genera algo distinto al preview, es un bug.
5. **Todo límite de plan se lee de `plans/{planId}`** — resolución/formato de descarga, cantidad de códigos, proyectos, miembros, días de histórico de stats. Nunca hardcodear límites en componentes ni Functions.
6. **Barcodes Code 39:** validar charset permitido (A-Z, 0-9, `- . $ / + % espacio`) antes de renderizar; mostrar error de validación en el formulario, no fallar en el render.
7. **La redirección responde ANTES de registrar el escaneo.** El 302 nunca espera escrituras en Firestore ni el reenvío a GA4.
8. **Agregados de stats SIEMPRE en UTC.** `statsDaily/{yyyy-mm-dd}` corta el día en UTC, inmutable. La zona horaria de la cuenta (`timeZone`) se aplica SOLO en la capa de presentación. Nunca re-agregar por zona horaria.

## Estructura del proyecto Angular

```
src/app/
  core/            // servicios singleton: auth, account, firestore, plan-limits
  features/
    auth/          // login, registro, onboarding trial
    dashboard/     // proyectos, lista de códigos, stats
    projects/      // CRUD de proyectos, settings (GA ID, stats start date, archivar)
    qr-editor/     // wizard tipo → contenido → diseño → descarga
    barcode-editor/// individual + batch
    account/       // perfil de cuenta, miembros (F4), dominios (F4)
    billing/       // Fase 3: plan actual, medidores de uso, portal Stripe
  shared/
    components/    // ui reutilizable (botones, cards, modals)
    models/        // interfaces TS espejo del modelo Firestore
    pipes/
functions/src/
  redirect/        // handler de {DOMAIN}/{slug} + reenvío GA4 Measurement Protocol
  scans/           // registro de escaneo + incrementos statsDaily/scanCount
  batch/           // generación por lote
  scheduled/       // expiración de trials (diaria)
  stripe/          // Fase 3
```

- Componentes standalone, `ChangeDetectionStrategy.OnPush`, signals para estado local
- Interfaces TypeScript en `shared/models` son la ÚNICA definición del modelo — Functions las importan del mismo paquete compartido. Un solo lugar de verdad
- Tailwind: solo clases utilitarias core; tokens de color del design system en `tailwind.config` (no hex sueltos en templates)

## Flujo de trabajo

- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- Cada fase del PLAN.md se trabaja en rama propia y se cierra con checklist de la fase completo
- Emuladores de Firebase (`firebase emulators:start`) para TODO el desarrollo local — nunca desarrollar contra el proyecto de producción
- Antes de marcar una tarea como terminada: `ng build` sin errores + Functions compilan + Security Rules pasan tests del emulador

## Anti-patrones prohibidos

- ❌ Renombrar colecciones/campos "para mejorar" sin actualizar este archivo y migrar datos
- ❌ Usar `uid` como dueño de recursos (siempre `accountId`; `createdByUid` es solo auditoría)
- ❌ Lógica de límites de plan duplicada en componentes (usar `PlanLimitsService`)
- ❌ Generar QR dinámicos codificando el destino final
- ❌ Crear códigos sin `projectId`
- ❌ Borrado físico de proyectos o códigos (archivar/pausar)
- ❌ `any` en TypeScript salvo justificación comentada
- ❌ Llamadas directas a Firestore desde componentes (siempre vía servicios de `core/`)
