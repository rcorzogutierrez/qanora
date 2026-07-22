# PLAN.md — Plan de implementación Qanora

Instrucciones para Claude Code. Trabajar fase por fase, en orden. No adelantar features de fases posteriores. Leer CLAUDE.md antes de cualquier tarea.

---

## Fase 0 — Fundaciones (primera sesión)

**Objetivo:** proyecto compilando, emuladores corriendo, modelo de datos tipado.

- [x] `ng new qanora` (standalone, routing, SCSS) + Tailwind CSS configurado con tokens de color del design system
- [x] Inicializar Firebase: Auth, Firestore, Functions (TS, Node 20), Storage, Hosting, Emuladores
- [x] Monorepo simple: paquete `shared/models` con TODAS las interfaces del modelo de datos de CLAUDE.md (incluye `accounts`, `members`, `projects`) — implementado como workspace npm `@qanora/shared` en la raíz (ver CLAUDE.md § Estructura del proyecto Angular)
- [x] Security Rules base: deny-all + tests de emulador que lo verifican (Firestore; Storage tiene rules deny-all pero sin test dedicado aún)
- [x] Instalar: `qr-code-styling`, `bwip-js`, `file-saver`, `ua-parser-js`, `@angular/fire`
- [x] CI mínimo: script que corre `ng build` + `tsc` de functions + tests de rules (`npm run ci`)

**Criterio de salida:** `firebase emulators:start` + `ng serve` levantan sin errores; un test de rules pasa. ✅ Verificado 2026-07-22.

---

## Fase 1 — MVP (4-6 semanas)

### 1.1 Auth + Cuenta + Trial ✅ (2026-07-22)
- [x] Registro/login con email+password y Google (`@angular/fire/auth`)
- [x] Function `onUserCreate` (implementada como `beforeUserCreated`, 2nd-gen): crea `accounts/{accountId}` (`plan: 'trial'`, `trialEndsAt: now + 14d`, `codesCount: 0`, `timeZone` placeholder — ver nota), miembro `admin` en `members/{uid}`, y un proyecto "Default" — TODO código pertenece a un proyecto desde el día uno. Custom claim `accountId` seteado en el mismo trigger (sin delay de propagación)
- [x] Guard de rutas autenticadas + resolución de `accountId` en `AccountService` (core), leído del ID token
- [x] Onboarding con días restantes de trial; banner persistente cuando queden ≤ 5

  Nota: `timeZone` usa un default fijo (`America/Mexico_City`) porque el trigger corre en el servidor sin acceso al navegador. Detectar `Intl.DateTimeFormat().resolvedOptions().timeZone` en el cliente y hacer un update posterior queda pendiente (no bloqueante para el criterio de salida de 1.1).

### 1.2 Motor de redirección (LA pieza central — hacer primero)
- [ ] Function HTTP `redirect`: recibe `{DOMAIN}/{slug}` → lookup en `shortSlugs/{slug}` → **302 inmediato** → registro de escaneo async (Regla de Dominio #7)
- [ ] Registro de escaneo: documento en `scans` + `FieldValue.increment()` en `codes.scanCount` y en `statsDaily/{yyyy-mm-dd}` (UTC — Regla #8) para total, byCountry, byDevice, byOs
- [ ] Metadata: user-agent parseado con `ua-parser-js`, país vía header `x-country` de Hosting, referrer
- [ ] Estados: `active` → redirect; `paused` → página "código pausado" con CTA; slug inexistente → 404 amigable
- [ ] Generación de slugs: 5-6 chars base62, colisión resuelta por transacción sobre `shortSlugs`

### 1.3 Editor QR
- [ ] Wizard: tipo (solo `website` en MVP) → contenido → diseño → descarga; el código se crea dentro del proyecto activo
- [ ] Toggle estático/dinámico con explicación clara de la diferencia
- [ ] Preview en vivo con `qr-code-styling` (reactive form + `valueChanges` + `debounceTime(150)`)
- [ ] Panel de diseño: color de puntos, color de fondo, estilo de puntos, estilo de esquinas, logo (upload a Storage, redimensionado client-side a ≤ 512px)
- [ ] REGLA DE DOMINIO #1: QR dinámico codifica `{DOMAIN}/{slug}`, nunca el destino. Test unitario que lo verifica
- [ ] Descargas: PNG/JPG (re-render al tamaño según plan, no upscale), SVG si el plan lo permite

### 1.4 Editor Barcode individual
- [ ] Portar la UI del generador de escritorio (referencia: captura Code 39): prefijo, sufijo, número de ítem, relleno con ceros, mayúsculas automáticas, checksum mod43, ancho de barra, alto mm, margen lateral, mostrar texto, tamaño de texto, color de barras/fondo
- [ ] Simbologías MVP: `code39`, `code128`
- [ ] Preview con `bwip-js` a canvas; validación de charset Code 39 en el formulario
- [ ] "Código resultante" visible en vivo (como en la app de escritorio)
- [ ] Descargas: PNG/SVG con mismas reglas de plan que QR

### 1.5 Dashboard
- [ ] Vista de proyectos (aunque en MVP solo exista "Default") → lista de códigos del proyecto (query por `accountId` + `projectId`, orden `createdAt desc`, paginada)
- [ ] Card por código: miniatura, tipo, estado, `scanCount`, acciones: editar destino (solo dynamic), pausar, duplicar, descargar
- [ ] Edición de destino de QR dinámico actualiza `codes` y `shortSlugs` en batch write

**Criterio de salida Fase 1:** flujo completo registro → crear QR dinámico → escanearlo con el teléfono (staging) → ver el escaneo en el dashboard → editar destino → el mismo QR redirige al nuevo destino.

---

## Fase 2 — Diferenciación (3-4 semanas)

### 2.1 Proyectos completos (referencia: uQR enterprise con 92 proyectos)
- [ ] CRUD de proyectos: crear, renombrar, archivar (`isArchived` — nunca borrar), mover códigos entre proyectos
- [ ] Settings por proyecto: `gaMeasurementId`, `statsStartDate`
- [ ] "Create multiple QRs": creación en lote de QRs dinámicos dentro de un proyecto (CSV de destinos)
- [ ] Límite `maxProjects` por plan

### 2.2 Estadísticas
- [ ] Vista de stats por código Y por proyecto: serie temporal (día/semana/mes), breakdown por país, dispositivo y OS — leyendo `statsDaily`, nunca los scans crudos
- [ ] Conversión de fechas UTC → `account.timeZone` SOLO en presentación (Regla #8)
- [ ] Respetar `statsStartDate` del proyecto como filtro inferior
- [ ] Histórico consultable limitado por `plans.statsHistoryDays` (free: 7 días, pago: todo)
- [ ] Reenvío a GA4: si el proyecto tiene `gaMeasurementId`, la Function de escaneo envía el evento vía Measurement Protocol (después del 302, nunca antes)

### 2.3 Más tipos de QR
- [ ] `vcard` (formulario de contacto → vCard 3.0), `wifi`, `whatsapp` (número + mensaje)
- [ ] `pdf` y `menu`: upload a Storage, página intermedia responsive servida por Hosting

### 2.4 Batch de barcodes (diferenciador clave)
- [ ] UI "Generación por lote": upload CSV (columnas: `text`, opcional `prefix`, `suffix`) + opciones globales de apariencia
- [ ] Function `batchGenerate`: parsea CSV, renderiza con `bwip-js` en Node, empaqueta ZIP, sube a Storage, URL firmada 24h
- [ ] Progreso en vivo: la Function actualiza `batchJobs/{jobId}` (`processed/total/status`), el front lo observa
- [ ] Límite de filas por plan (leer de `plans`)

**Criterio de salida:** CSV de 500 filas → ZIP con progreso visible; stats de un proyecto con datos reales visibles también en el GA4 de prueba.

---

## Fase 3 — Monetización (2-3 semanas)

Benchmark de mercado (facturación real de uQR): Professional $49.95/mes → Enterprise Tier 1 ~$1,188/año → Tier 2 ~$2,400-3,000/año (20,000 QRs, multiusuario, dominios, API, SSO). Posicionar nuestros precios contra esta escalera.

- [ ] Instalar extensión Stripe "Run Payments with Stripe"; productos/precios en Stripe, sincronizados a Firestore
- [ ] Colección `plans` poblada: `free` (2 QR dinámicos, 1 proyecto, 500px, stats 7 días), `basic` (50 dinámicos, 10 proyectos, stats completas, 2000px, SVG), `pro` (ilimitado, batch, GA forwarding, 4000px, API futura). Ajustar cifras antes de lanzar
- [ ] Página de billing: plan actual, **medidores de uso** (`codesCount / maxDynamicCodes`, proyectos, estilo "9260/20000"), botón Upgrade
- [ ] Checkout + portal de facturación de Stripe (facturas PDF, método de pago y renovación los maneja el portal — no reimplementar)
- [ ] Function programada diaria: trials vencidos sin suscripción → `plan: 'free'` + códigos dinámicos que excedan el límite free → `paused` (los más antiguos se conservan activos)
- [ ] Webhook Stripe → cambios de suscripción actualizan `accounts.plan`; downgrade aplica límites igual que expiración de trial
- [ ] Emails transaccionales (extensión Trigger Email + SMTP): bienvenida, trial por vencer (día 10), trial vencido

**Criterio de salida:** ciclo completo trial → vencimiento → pausa → suscripción en Stripe test mode → reactivación automática; medidores de uso correctos.

---

## Fase 4 — Escala / Enterprise (backlog, no iniciar sin aprobación)

Referencia directa: la cuenta Enterprise Tier 2 real de las capturas (User management, Domains, SSO).

- Equipos multiusuario: invitar miembros a `accounts/{accountId}/members`, rol `projectManager` con `projectIds` asignados (la arquitectura de cuentas ya lo soporta — solo UI + Rules)
- Dominios cortos personalizados por cliente
- API pública con API keys (colección `apiKeys`, rate limiting, docs)
- SSO (SAML/OIDC vía Identity Platform)
- White-label
- Más simbologías: EAN-13, UPC-A, GS1-128, DataMatrix (bwip-js ya las soporta; solo UI + validación)
- Distributed counters para `statsDaily` de códigos con ráfagas >1 escaneo/seg (riesgo conocido, no trabajo actual)

---

## Decisiones pendientes (resolver con Rafa antes de la fase correspondiente)

1. ~~Nombre del producto~~ → **DECIDIDO: Qanora**. ~~Dominio~~ → **DECIDIDO: arrancar con `qanora.web.app` (gratis, Firebase Hosting)**. Acción inmediata: reservar el site ID `qanora` en Firebase Hosting (es global y por orden de llegada — si está tomado, alternativas: `qanora-app`, `getqanora`). El dominio base vive en `REDIRECT_BASE_URL` (config), y por la Regla de Dominio #2 la migración futura a un dominio corto de pago (`qnra.to` / `qnr.io`, cuando el producto sea sustentable) es solo un cambio de config: los QRs viejos siguen vivos por web.app. Marca y @qanora en redes: verificar/reservar cuando se acerque el lanzamiento público
2. Librería i18n: `@angular/localize` vs transloco (Fase 1)
3. Cifras finales de límites por plan y precios contra el benchmark uQR (Fase 3)
4. Proveedor SMTP para transaccionales (Fase 3)
