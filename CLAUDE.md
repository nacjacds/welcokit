# CLAUDE.md — WelcoKit

- **Dominio:** welcokit.com
- **Repositorio:** https://github.com/nacjacds/welcokit

## Memoria del proyecto

`memory.md` (raíz del repo) es el estado vivo del proyecto: qué está en curso, decisiones, pendiente y gotchas.
- Léelo SIEMPRE al empezar una sesión.
- La sección «Estado automático» (rama, commits recientes, migraciones) la regenera sola `scripts/actualizar-memory.py` al terminar
  cada respuesta (hook Stop de `.claude/settings.json`): no la edites a mano.
- Al terminar cualquier tarea que cambie el proyecto, actualiza las demás secciones de `memory.md` antes de darla por cerrada.
  El repo es público: no incluyas claves, teléfonos, direcciones privadas ni datos de huéspedes.

## Visión del producto

Web app SaaS para anfitriones de alojamientos turísticos (Airbnb, Vrbo, Booking) que genera automáticamente una guía digital personalizada para sus huéspedes, con recomendaciones locales generadas por IA y un asistente de WhatsApp integrado.

**Propuesta de valor:** El anfitrión rellena su información una vez → la IA genera el contenido → el huésped accede vía QR o enlace sin instalar nada.

**Diferenciador clave vs competencia (Touch Stay, Hostfully, Maestro Host):**
- Recomendaciones locales generadas por IA (Google Places API + Claude), organizadas en bloques especializados (dónde comer, copas y bares, ocio nocturno, qué visitar) editables por el anfitrión
- Asistente de WhatsApp que responde preguntas del huésped usando el contenido de la guía como base de conocimiento
- Guía pública multiidioma (ES/EN) con traducción pre-generada y cacheada al guardar, sin coste recurrente por huésped
- Precio justo para el mercado español: planes desde 5€/mes (ver tabla completa en "Modelo de negocio")
- Sin complejidad de PMS — solo guía + IA + WhatsApp
- Importación automática de datos desde un anuncio de Airbnb para arrancar más rápido

---

## Stack técnico

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Next.js API Routes + Supabase (PostgreSQL + Auth + Storage)
- **IA:**
  - Anthropic Claude API — `claude-sonnet-4-6` para generación de contenido, recomendaciones y respuestas del bot
  - `claude-haiku-4-5-20251001` para traducción de la guía pública (20x más barato, resultado suficiente para textos cortos)
- **Recomendaciones locales:** Google Places API (Text Search + Place Details)
- **WhatsApp:** YCloud (WhatsApp Business API) + n8n para workflows
- **Iconos:** Lucide React (line-style, sin emojis en la guía pública)
- **Tipografía:** Playfair Display (serif, títulos) vía `next/font/google` + Inter (sans, cuerpo)
- **Idioma del panel del anfitrión:** `next-intl` + cookie `NEXT_LOCALE` (`lib/locale.ts`) — sistema independiente del idioma de la guía pública (`lib/guide-i18n.ts` + `GuideLocaleProvider`), no comparten cookie ni lógica
- **PDF imprimible:** `@react-pdf/renderer` (sin dependencia de Chromium/Puppeteer — corre bien en el contenedor de EasyPanel) para el "Imprimir QR" del editor
- **Deploy:** OVH VPS con EasyPanel — **tanto el frontend (welcokit.com) como n8n (ia.neurodatos.com) se despliegan ahí**, no en Vercel. Auto deploy activado en EasyPanel (desde 2026-10-25): cada `git push` a `main` redespliega solo, así que no se hace push sin comprobar antes que compila
- **Pagos:** Stripe (suscripciones mensuales)
- **Email transaccional:** Resend

---

## Estructura del proyecto

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/     # Lee el token del hash de recovery y llama a auth.updateUser()
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Layout del panel del anfitrión (sidebar, badge de tickets abiertos)
│   │   ├── (root)/
│   │   │   ├── dashboard/      # Vista principal con lista de propiedades + onboarding wizard
│   │   │   └── account/        # Plan, facturación, perfil, borrar cuenta
│   │   └── properties/
│   │       ├── new/            # Crear nueva propiedad
│   │       └── [id]/
│   │           ├── edit/       # Editor de guía por bloques + recomendaciones + Airbnb import
│   │           ├── settings/   # Config WhatsApp, color, idioma
│   │           └── stats/      # Analíticas de visitas (plan Pro/Agency)
│   ├── admin/                  # Panel superadmin (solo ignajac@gmail.com)
│   │   └── properties/         # Listado con soft-delete/restore/purge
│   ├── guide/
│   │   └── [slug]/             # Guía pública del huésped (sin auth)
│   │       ├── layout.tsx      # GuideLocaleProvider + WhatsApp FAB
│   │       ├── page.tsx        # Hero + grid de tiles
│   │       ├── [type]/         # Página de sección por tipo de bloque
│   │       └── recomendaciones/
│   └── api/
│       ├── properties/
│       │   ├── import-airbnb/      # Scrapea og:title/og:description de un anuncio de Airbnb
│       │   └── [id]/
│       │       ├── blocks/             # Crear bloques (defaults por tipo)
│       │       ├── cover-image/        # Subida/borrado imagen de portada
│       │       ├── qr/                 # QR de la guía (data URL, para pantalla)
│       │       ├── qr-print/            # PDF "tent card" imprimible (@react-pdf/renderer)
│       │       └── property-recommendations/
│       │           └── regenerate/     # Regenera recomendaciones IA (respeta cuota mensual)
│       ├── property-recommendations/[id]/  # Editar/eliminar una recomendación individual
│       ├── recommendations/[id]/           # CRUD de la tabla legacy `recommendations` (supermarket/pharmacy/transport)
│       ├── guide-blocks/[id]/
│       │   └── images/             # Subida/borrado imágenes por bloque
│       ├── guide/
│       │   ├── translate-block/    # Fallback síncrono de traducción si el pre-generado no está listo
│       │   └── analytics/          # Registra guide_opened/section_viewed/whatsapp_clicked
│       ├── ai/
│       │   ├── generate-content/   # Genera borrador inicial con Claude
│       │   ├── generate-place/     # Descripción IA para una recomendación añadida a mano
│       │   └── recommendations/    # (legacy) Recomendaciones Google Places + Claude
│       ├── places/
│       │   ├── autocomplete/       # Google Places Autocomplete (añadir recomendación a mano)
│       │   └── photo/              # Proxy de foto de Google Places
│       ├── admin/
│       │   ├── impersonate/            # Superadmin entra a la cuenta de un anfitrión
│       │   │   └── stop/               # Vuelve a la sesión de superadmin
│       │   ├── profiles/[id]/plan/     # Cambiar plan manualmente (no toca Stripe)
│       │   ├── properties/[id]/
│       │   │   ├── purge/              # Borrado permanente (solo si ya tiene deleted_at)
│       │   │   └── restore/            # Limpia deleted_at
│       │   └── tickets/[id]/           # Marcar ticket de soporte como resuelto
│       ├── cron/
│       │   └── regenerate-recommendations/  # Cron diario (vercel.json) — regeneración automática cada ~90 días
│       ├── whatsapp/
│       │   └── webhook/            # Webhook de YCloud para mensajes entrantes
│       └── stripe/
│           ├── webhook/                     # checkout.session.completed, subscription.updated/deleted
│           ├── create-checkout-session/     # Crea customer si falta + Checkout Session (subscription)
│           ├── create-portal-session/       # Stripe Customer Portal (gestionar/cancelar)
│           └── downgrade-to-free/           # Downgrade manual sin pasar por el Customer Portal
├── components/
│   ├── landing/                # Homepage pública de marketing (bilingüe ES/EN)
│   │   ├── LandingPage.tsx
│   │   ├── LandingHero.tsx / LandingFeatures.tsx / LandingProblemSolution.tsx
│   │   ├── LandingHowItWorks.tsx / LandingPricing.tsx / LandingFinalCta.tsx / LandingFooter.tsx
│   │   └── GuidePreviewCard.tsx / HandDrawnMark.tsx / WaveDivider.tsx  # Elementos decorativos
│   ├── guide/                  # Componentes de la guía pública
│   │   ├── HeroSection.tsx         # Imagen de portada + gradiente + título Playfair
│   │   ├── GuideSectionHeader.tsx  # Header sticky compacto (icono grande + cover image)
│   │   ├── SectionHeading.tsx      # Icono Lucide 48px + título Playfair por sección
│   │   ├── TileGrid.tsx            # Grid de tiles (2 cols móvil / 3 desktop)
│   │   ├── TilePanel.tsx           # Render genérico de content (listas con Check icon)
│   │   ├── WifiPanel.tsx           # QR de conexión WiFi + estado "conectado"
│   │   ├── PlaceListPanel.tsx      # Cards de lugares (tipo `drinks`, el único "place list" manual que queda)
│   │   ├── RecommendationsPanel.tsx # Recomendaciones IA (attractions/restaurants/nightlife/beaches/nature)
│   │   ├── EmergencyPanel.tsx
│   │   ├── BlockTitle.tsx          # Título traducido (custom) o estático (tipos conocidos)
│   │   ├── useTranslatedText.ts    # Hook compartido: lee la traducción pre-generada (fallback a /api/guide/translate-block)
│   │   ├── GuideLocaleProvider.tsx # Contexto ES/EN (localStorage) + propertyId
│   │   ├── LanguageSwitcher.tsx
│   │   ├── WhatsAppFab.tsx         # Pill flotante wa.me/ si whatsapp_number está configurado
│   │   └── BackToGuideButton.tsx
│   ├── editor/                 # Componentes del editor del anfitrión
│   │   ├── BlockEditor.tsx / BlockToolbar.tsx
│   │   ├── PublishPanel.tsx        # Publicar, portada, WhatsApp, QR en pantalla, Imprimir QR, compartir guía
│   │   ├── AirbnbImportPanel.tsx   # Importar datos desde una URL de Airbnb
│   │   ├── PropertyRecommendationsSection.tsx  # Recomendaciones IA por categoría, con cuota y regenerar
│   │   ├── GuideActionButtons.tsx  # Par "Ver guía" / "Compartir guía", reutilizado desktop+mobile
│   │   ├── blocks/
│   │   │   ├── WifiBlock.tsx / CheckinBlock.tsx / EmergencyBlock.tsx / CustomBlock.tsx
│   │   │   ├── RulesBlock.tsx      # rules | parking | appliances | pool
│   │   │   ├── PlaceListBlock.tsx  # solo `drinks`
│   │   │   ├── AIPlaceGenerateButton.tsx / PlaceImageUploader.tsx
│   │   └── AIGenerateButton.tsx
│   ├── dashboard/
│   │   ├── ShareGuideDialog.tsx    # Mensaje + enlace + QR de pantalla (genérico, sin datos de huésped)
│   │   ├── OnboardingWizard.tsx (+ OnboardingStep1/2/3, OnboardingProgressBar)
│   │   ├── PropertyCard.tsx / PropertyLimitNotice.tsx / SidebarNav.tsx / MobileTopbar.tsx
│   │   └── UpgradedToast.tsx       # Toast tras volver de Stripe Checkout (?upgraded=true)
│   ├── account/                # ChangePlanDialog, AvatarUpload, ProfileForm, DeleteAccountButton
│   ├── admin/                  # AdminHostsTable, AdminPropertiesTable, AdminTicketsSection, ImpersonationBanner
│   ├── shared/
│   │   └── LocaleProvider.tsx  # Idioma del dashboard (next-intl), independiente del de la guía pública
│   └── ui/                     # Componentes genéricos (shadcn/ui)
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts           # createClient() + createServiceRoleClient()
│   ├── claude.ts               # Cliente Claude API + generación (sonnet) + translateText (haiku)
│   ├── google-places.ts        # Cliente Google Places API
│   ├── guide-i18n.ts           # Diccionario ES/EN + getBlockTitle() (guía pública)
│   ├── guide-icons.tsx         # Mapeo BlockType → icono Lucide
│   ├── locale.ts               # Idioma del dashboard (cookie NEXT_LOCALE, detección Accept-Language)
│   ├── admin.ts                # isSuperAdmin(email)
│   ├── impersonation.ts        # Firma/valida la cookie que guarda el refresh_token del admin durante una impersonación
│   ├── properties.ts           # Retención de propiedades borradas (30 días) + clasificación de disponibilidad de guía
│   ├── analytics.ts            # logAnalyticsEvent() — best-effort, nunca rompe la guía
│   ├── qr.ts                   # QR de la URL pública de la guía (pantalla y print) + getGuideUrl()
│   ├── pdf/
│   │   ├── tent-card.tsx       # Documento react-pdf del "Imprimir QR" (A4, plegable, autoportante)
│   │   └── logo.ts             # Rasteriza public/logo.svg con sharp para incrustarlo en el PDF
│   ├── recommendations/
│   │   ├── constants.ts        # Categorías, iconos, intervalo de regeneración automática
│   │   ├── generateRecommendations.ts  # Google Places + Claude → property_recommendations
│   │   └── quota.ts            # Cuota mensual de regeneraciones manuales por host (lib/plans.ts)
│   ├── translations/           # Traducción pre-generada de la guía pública (ver sección dedicada)
│   │   ├── constants.ts / extract.ts / lookup.ts
│   │   ├── translateContent.ts / translateRecommendations.ts
│   │   ├── fetchTranslations.ts / trigger.ts
│   ├── whatsapp/
│   │   ├── ycloud.ts           # Cliente YCloud
│   │   └── bot.ts              # Lógica del bot — build prompt + llamada Claude
│   └── utils.ts
├── supabase/
│   └── migrations/
└── n8n/
    └── workflows/
        └── whatsapp-bot.json   # Workflow n8n exportado
```

---

## Base de datos (Supabase)

### Tablas principales

```sql
-- Anfitriones (extendido de auth.users)
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  full_name text,
  phone text,                      -- usado también como fallback del botón WhatsApp de la guía
  avatar_url text,                 -- bucket avatars, 200x200 webp, con cache-busting ?v=timestamp
  plan text DEFAULT 'free',        -- 'free' | 'starter' | 'pro' | 'agency' (ver lib/plans.ts)
  stripe_customer_id text,
  dashboard_locale text DEFAULT 'es', -- 'es' | 'en' — idioma del PANEL del anfitrión (next-intl), no de la guía
  created_at timestamptz DEFAULT now()
)

-- Propiedades/alojamientos
properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES profiles(id),
  name text NOT NULL,              -- "Apartamento Triana"
  address text,
  lat numeric,                     -- Geocodificado al guardar la dirección — usado por Google Places
  lng numeric,
  slug text UNIQUE NOT NULL,       -- URL pública: /guide/apartamento-triana
  cover_image_url text,            -- bucket cover-images, con cache-busting ?v=timestamp
  accent_color text DEFAULT '#1B4F72',
  host_tone text DEFAULT 'friendly', -- 'friendly' | 'formal'
  language text DEFAULT 'es',      -- Idioma de la guía pública de ESTA propiedad (no confundir con dashboard_locale)
  whatsapp_number text,            -- Formato internacional sin '+' ni espacios (ej: 34600000000)
  welcome_message text,            -- Mensaje de bienvenida mostrado en la guía (WelcomeMessage.tsx)
  airbnb_url text,                 -- URL del anuncio, si se importó desde Airbnb
  bedrooms integer,
  bathrooms integer,
  max_guests integer,
  is_published boolean DEFAULT false,
  deleted_at timestamptz,          -- Soft-delete por el host — ver "Borrado de propiedades (soft-delete)"
  deleted_by_host_plan text,       -- Plan del host en el momento del borrado, para contexto en el panel admin
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Bloques de contenido de la guía
guide_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  type text NOT NULL,              -- ver lista completa de tipos abajo
  title text,                      -- solo se usa en la guía pública si type = 'custom'
  icon text,                       -- emoji, usado solo en el editor (la guía pública usa Lucide)
  content jsonb NOT NULL,          -- estructura específica por tipo de bloque
  images jsonb NOT NULL DEFAULT '[]', -- BlockImage[]: {url, alt, width, height, caption}
  order_index integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)
-- type IN (
--   'wifi', 'checkin', 'checkout', 'rules', 'parking', 'appliances', 'custom',
--   'emergencias', 'pool', 'drinks'
-- )
-- 'restaurants' | 'nightlife' | 'attractions' EXISTIERON aquí como listas libres pero se
-- retiraron (migration 20260709100300) a favor de `property_recommendations`, con datos
-- reales de Google Places en vez de texto fabricado por Claude. 'drinks' es el único tipo
-- de "lista de lugares" manual que queda en guide_blocks.

-- Recomendaciones locales generadas por IA con datos reales de Google Places —
-- ver "Sistema de recomendaciones locales" para el flujo completo
property_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category text NOT NULL,          -- 'attractions' | 'restaurants' | 'nightlife' | 'beaches' | 'nature'
  place_id text,                   -- Google Place ID, null si se añadió a mano sin autocompletar
  name text NOT NULL,
  address text,
  lat numeric,
  lng numeric,
  distance_meters integer,
  distance_walking_minutes integer,
  maps_url text,
  rating numeric,
  photo_url text,
  description text,                -- Generado por Claude a partir de datos reales; editable por el anfitrión
  description_en_override text,    -- Si el host escribe su propia versión EN, se prefiere sobre la traducción automática
  source text NOT NULL DEFAULT 'ai_curated', -- 'ai_curated' | 'manual' | 'ai_curated_edited'
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
)

-- Metadatos de generación por propiedad: cuándo se regeneró por última vez y
-- qué categorías opcionales (beaches/nature) se detectaron cerca — evita
-- mostrar un tile "Playas" vacío en una propiedad de interior
property_recommendation_meta (
  property_id uuid PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  last_generated_at timestamptz,
  categories_detected text[] NOT NULL DEFAULT '{}'
)

-- Contador de regeneraciones manuales para la cuota mensual por host (lib/plans.ts)
recommendation_regeneration_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  trigger_type text NOT NULL DEFAULT 'manual', -- 'manual' (cuenta para la cuota) | 'scheduled' (cron, no cuenta)
  triggered_at timestamptz NOT NULL DEFAULT now()
)

-- Recomendaciones "de necesidades prácticas" — sistema legacy, más simple,
-- que NO se retiró: sigue vivo para estas 3 categorías que property_recommendations no cubre
recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  category text NOT NULL,          -- 'supermarket' | 'pharmacy' | 'transport'
  name text NOT NULL,
  description text,
  address text,
  google_place_id text,
  rating numeric(2,1),
  distance_meters integer,
  maps_url text,
  is_ai_generated boolean DEFAULT true,
  is_visible boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

-- Conversaciones del bot de WhatsApp
bot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id),
  guest_phone text NOT NULL,
  messages jsonb DEFAULT '[]',     -- Array de {role, content, timestamp}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Eventos de analítica de la guía pública (plan Pro/Agency, ver /properties/[id]/stats)
analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  event_type text NOT NULL,        -- 'guide_opened' | 'section_viewed' | 'whatsapp_clicked'
  section text,
  country text,                    -- Header x-vercel-ip-country si está disponible
  created_at timestamptz NOT NULL DEFAULT now()
)

-- Caché de traducción PRE-GENERADA de la guía pública (ver "Sistema de traducciones")
-- Reemplaza a la antigua translations_cache (md5 + rate limiting on-the-fly)
content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  block_type text NOT NULL,        -- 'wifi' | 'checkin' | ... | 'welcome_message' | tipo de recomendación
  block_id text,                   -- id del bloque/recomendación concreto; null si es a nivel de propiedad
  source_locale text NOT NULL,     -- 'es' siempre hoy (lib/translations/constants.ts)
  target_locale text NOT NULL,     -- 'en' hoy — añadir idiomas no requiere cambio de schema
  source_hash text NOT NULL,       -- hash del contenido original, para saber si quedó desactualizado
  translated_content jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
-- UNIQUE (property_id, block_type, block_id, target_locale), con un índice único
-- parcial adicional para block_id IS NULL (ver upsert_content_translation() más abajo)

-- Tickets de soporte in-app (widget flotante del dashboard, ver "Sistema de soporte")
support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,              -- 'bug' | 'feature_request' | 'question'
  subject text NOT NULL,
  description text NOT NULL,
  screenshot_url text,             -- bucket support-screenshots, opcional
  status text NOT NULL DEFAULT 'open', -- 'open' | 'closed'
  created_at timestamptz DEFAULT now()
)
```

**Eliminadas por completo** (migration `20260709090800_drop_bookings_guest_messages`, backups en `supabase/backups/`): `bookings` y `guest_messages` — el feature de "Reservas" y el de "Deja tu huella" (guest book/reviews) se quitaron enteros del producto para centrar el alcance en guía + recomendaciones IA. `lib/booking-message.ts`, `NewBookingDialog.tsx`, `BookingsList.tsx` y el envío de email de bienvenida por reserva ya no existen — si ves referencias a "bookings" en un commit antiguo o en tu memoria de una sesión anterior, están obsoletas.

### Bloque de "lista de lugares" (solo `drinks`)

`restaurants`/`nightlife`/`attractions` existieron aquí como listas libres, pero se retiraron a favor de `property_recommendations` (datos reales de Google Places + descripción de Claude). `drinks` (copas y bares) es el único tipo que sigue usando este patrón manual, editado con `PlaceListBlock.tsx` y renderizado en la guía con `PlaceListPanel.tsx`:

```typescript
// guide_blocks.content para drinks
{
  places: [
    {
      id: string,                 // uuid generado en el cliente, solo para React key
      name: string,
      description: string,        // 2 frases, se traduce automáticamente en EN
      address: string,
      distance_meters: number | null,
      maps_url: string,
      google_place_id: string | null,
      price_level?: '€' | '€€' | '€€€' | null,
    }
  ]
}
```

En la guía pública las cards se ordenan por `distance_meters` ascendente (los lugares sin distancia van al final). Para `attractions`/`restaurants`/`nightlife`/`beaches`/`nature` ver "Sistema de recomendaciones locales" más abajo.

---

## Sistema de traducciones (guía pública ES/EN)

**Arquitectura pre-generada** (cambió del modelo anterior "on-the-fly con rate limiting" — ver nota al final): la traducción se dispara en background **al guardar**, no cuando el huésped abre la guía.

- **Bloques de tipo conocido** (wifi, checkin, checkout, rules, parking, appliances, pool, emergencias, drinks): el título se traduce con un diccionario estático en `lib/guide-i18n.ts` (`block_wifi`, `block_pool`, etc.) — sin llamar a Claude.
- **Contenido libre** (bloques `custom`, `welcome_message`, descripciones de `property_recommendations`): al guardar, `lib/translations/trigger.ts` (`triggerBlockTranslation` / `triggerWelcomeMessageTranslation`) lanza la traducción **fire-and-forget** — la respuesta al host no espera a que termine — para cada idioma en `TARGET_LOCALES` (hoy solo `en`).
- **Tabla `content_translations`:** clave `(property_id, block_type, block_id, target_locale)`. La escritura pasa por la función Postgres `upsert_content_translation()` (migration `20260713100000`), que resuelve de forma atómica la carrera entre dos guardados concurrentes reintentando ante `unique_violation` en vez de comprobar-y-luego-escribir — corrigió un bug real visto en producción con traducciones duplicadas y distinto wording para el mismo bloque.
- **Fallback síncrono:** si el huésped cambia a EN antes de que la traducción en background haya terminado (o si se perdió por cualquier motivo), `useTranslatedText` llama a `POST /api/guide/translate-block`, que traduce al vuelo y persiste el resultado igual que el flujo en background. **Ya no hay rate limiting** (20/IP/hora, 100/property/día) — tenía sentido cuando cada vista de huésped podía disparar una llamada a Claude; con pre-generación, la ruta síncrona solo se usa en el raro caso de caché fría.
- **Descripciones de `property_recommendations`:** traducidas por `lib/translations/translateRecommendations.ts`. Si el host rellena `description_en_override`, esa versión manual siempre gana sobre la traducción automática (ver campo en la tabla).
- **Modelo:** `claude-haiku-4-5-20251001` (`translateText` en `lib/claude.ts`) — nunca `sonnet`.
- `lib/translations/extract.ts` decide qué texto de cada tipo de bloque es traducible; `lib/translations/lookup.ts` expone `lookupTranslation()` para leer el resultado ya cacheado del lado del servidor/cliente sin re-fetch.

> Nota histórica: la tabla `translations_cache` (md5 + rate limiting por IP/property) sigue pudiendo aparecer en migraciones antiguas o en memoria de sesiones previas, pero **ya no es el sistema activo** — `content_translations` la reemplazó por completo.

---

## Arquitectura de la guía pública

- **Navegación por páginas separadas:** `/guide/[slug]` (hero + grid de tiles) → `/guide/[slug]/[type]` (una página por tipo de bloque) y `/guide/[slug]/recomendaciones`. Cada página de sección tiene su propio `BackToGuideButton` al final además del botón "Volver" del header.
- **Header de sección** (`GuideSectionHeader.tsx`): sticky, compacto en móvil (solo icono + nombre del alojamiento), usa `cover_image_url` como fondo con gradiente oscuro si existe, o `accent_color` sólido si no.
- **Idioma:** `GuideLocaleProvider` guarda ES/EN en `localStorage` (`guide-locale`) y expone `propertyId` en el mismo contexto (usado por el fallback síncrono de traducción, ver "Sistema de traducciones").
- **Botón de WhatsApp:** `WhatsAppFab.tsx` — pill flotante verde (#25D366) con icono `MessageCircle`. Se resuelve en `app/guide/[slug]/layout.tsx`: usa `properties.whatsapp_number` si está relleno, y si no, hace fallback a `profiles.phone` del `host_id` de la propiedad (vía `createServiceRoleClient()`, porque `profiles` no tiene policy de SELECT pública). Solo se renderiza si alguno de los dos valores existe. Enlaza a `https://wa.me/{numero}`.
- **Avatar del anfitrión en el mensaje de bienvenida:** `WelcomeMessage.tsx` muestra un `Avatar` circular de 48px junto a "Hola, soy {nombre}" usando `profiles.avatar_url` (con fallback a iniciales). El lookup de `profiles` en `app/guide/[slug]/page.tsx` también usa `createServiceRoleClient()` por el mismo motivo de RLS.
- **WiFi con QR de conexión automática:** `WifiPanel.tsx` genera en el cliente (librería `qrcode`) un QR con el payload `WIFI:T:WPA;S:{red};P:{contraseña};;` (200×200px). Solo se muestra si hay red **y** contraseña rellenas — una red sin contraseña no genera QR.
- **Estado "ya estoy conectado":** se guarda en `localStorage` con key `wifi_connected_{property_id}` para persistir entre recargas; incluye enlace "Cambiar red" que borra la key.

---

## Imágenes y Storage (Supabase)

| Bucket | Uso | Límite | Procesado |
|---|---|---|---|
| `block-images` | Imágenes por bloque de contenido (hasta 3 por bloque) | 2MB, máx. 1200px de ancho | Reescaladas y convertidas a WebP con `sharp` |
| `cover-images` | Imagen de portada del hero (`properties.cover_image_url`) | 3MB, solo JPG | Reescalada a máx. 1920px de ancho, calidad 80% con `sharp` |
| `avatars` | Foto de perfil del anfitrión (`profiles.avatar_url`) | 1MB, JPG/PNG/WebP | Recortada a 200×200 centrada (`fit: cover`) y convertida a WebP con `sharp` |
| `support-screenshots` | Captura opcional adjunta a un ticket de soporte | 2MB, JPG/PNG/WebP | Sin reprocesar — solo se valida que sea una imagen decodificable |

Estructura común de imagen (campo `images` de `guide_blocks`, tipo `BlockImage[]`):

```typescript
{ url: string, alt: string, width: number, height: number, caption: string }
```

Todos los buckets son públicos para lectura (URL directa). Para `block-images`/`cover-images`, insert/update/delete están protegidos por RLS en `storage.objects` comprobando que el primer segmento de la ruta (`property_id`) pertenece al `host_id` autenticado. Para `avatars`/`support-screenshots`, el path es `{user_id}/...` y la política compara directamente contra `auth.uid()` (sin join a otra tabla).

---

## Sistema de soporte in-app

- **Widget flotante** (`SupportWidget.tsx`): botón "?" en la esquina inferior izquierda del **dashboard únicamente** (nunca en la guía pública). Al pulsarlo abre un panel con 3 opciones que preseleccionan el `type` del ticket: "Reportar un problema" (`bug`), "Sugerir una mejora" (`feature_request`), "Tengo una pregunta" (`question`).
- **Formulario:** asunto (máx. 100 caracteres), descripción (máx. 1000, con contador), captura de pantalla opcional (JPG/PNG/WebP, máx. 2MB). Envío como `multipart/form-data` a `POST /api/support/tickets`.
- **Backend:** el endpoint valida con Zod, sube la captura al bucket `support-screenshots` en `{user_id}/{timestamp}.{ext}`, e inserta el ticket con el cliente autenticado normal (cubierto por la policy `support_tickets_insert_own`). No existe ninguna policy de RLS anon/pública en `support_tickets` — el único acceso de lectura fuera del propio dueño es el panel admin, que usa `createServiceRoleClient()` protegido por `isSuperAdmin()`, siguiendo el mismo patrón defensivo que `bot_conversations`.
- **Notificación:** al crear el ticket se envía un email a `ignajac@gmail.com` vía Resend (`sendSupportTicketNotification` en `lib/email.ts`) con tipo, asunto, descripción y enlace a la captura si existe. El envío está en un try/catch best-effort — un fallo de Resend nunca bloquea la creación del ticket (mismo patrón lazy-init que el resto de emails transaccionales: si falta `RESEND_API_KEY` la función retorna sin lanzar error).
- **Confirmación al anfitrión:** tras el envío, el widget muestra "Hemos recibido tu mensaje, te responderemos en 24h" sin cerrar automáticamente el panel.
- **Panel superadmin (`/admin`):** sección "Soporte" (`AdminTicketsSection.tsx`) con filtros por tipo y estado, y botón "Marcar como resuelto" por ticket (`PATCH /api/admin/tickets/[id]`, actualiza `status` a `closed`). El link "Admin" del sidebar del dashboard muestra un badge con el recuento de tickets `open` (`(dashboard)/layout.tsx`, contado con el service-role client, solo visible para `isSuperAdmin`).

---

## Compartir guía y QR

> El feature de "Reservas" (`bookings`) y su email de bienvenida automático **se eliminaron por completo** (ver nota en "Base de datos"). Lo que queda es un flujo genérico de compartir, sin conocer huésped ni fechas.

- **`GuideActionButtons.tsx`** (`components/editor/`): el par "Ver guía" / "Compartir guía", reutilizado en desktop (inline en `PublishPanel.tsx`) y mobile (portal a un slot en `PropertyEditor.tsx`) para que ambos layouts queden sincronizados desde una única fuente.
- **`ShareGuideDialog.tsx`** (`components/dashboard/`): panel con enlace directo a la guía y QR descargable (`GET /api/properties/[id]/qr`) — botón "Copiar enlace" con feedback visual 2s. Ya no acepta datos de huésped/reserva; es puramente genérico.
- **QR en pantalla vs QR para imprimir:**
  - `GET /api/properties/[id]/qr` — data URL PNG 512px, para mostrar/descargar desde el editor o `ShareGuideDialog`.
  - `GET /api/properties/[id]/qr-print` — PDF "tent card" en A4 (ver "Imprimir QR" más abajo), para colocar físicamente en el alojamiento.

---

## Sistema de recomendaciones locales (property_recommendations)

Reemplaza el sistema antiguo de listas de texto libre por recomendaciones respaldadas con datos reales de Google Places.

- **Categorías:** `attractions`, `restaurants`, `nightlife` se buscan siempre (`BASE_RECOMMENDATION_CATEGORIES`); `beaches`, `nature` solo se conservan si Google Places realmente encuentra resultados cerca (`OPTIONAL_RECOMMENDATION_CATEGORIES`) — así una propiedad de interior nunca muestra un tile "Playas" vacío. Iconos y etiquetas en `lib/recommendations/constants.ts`.
- **Generación:** `lib/recommendations/generateRecommendations.ts` — Google Places Text Search por categoría → filtra por rating/nº de reseñas → Claude escribe una descripción corta y específica (qué pedir, cuándo ir) a partir de los datos reales, nunca inventada.
- **Regeneración automática:** cron diario (`vercel.json` → `/api/cron/regenerate-recommendations`), pero cada propiedad solo se regenera si pasaron ≥`REGENERATION_INTERVAL_DAYS` (90) desde `property_recommendation_meta.last_generated_at` — no se re-generan todas cada día.
- **Regeneración manual:** botón "Regenerar" por sección en el editor y uno global en Ajustes; consume la cuota mensual `monthlyRecommendationRegenerations` de `lib/plans.ts` (compartida entre todas las propiedades del host, no por propiedad). `lib/recommendations/quota.ts` calcula uso/restante/fecha de reset contando `recommendation_regeneration_usage` desde el inicio del mes en curso (`trigger_type = 'manual'`; las del cron no cuentan).
- **Añadir a mano:** el host puede añadir una recomendación manualmente con autocompletado de Google Places (`/api/places/autocomplete`) y descripción generada con IA a partir de los datos reales (`/api/ai/generate-place`) — queda con `source = 'manual'`.
- **Editar sin perder al regenerar:** editar una recomendación `ai_curated` la mueve a `ai_curated_edited` — la regeneración automática/manual solo reemplaza filas `ai_curated` puras, así que tanto las manuales como las editadas sobreviven a una regeneración.
- **Override de descripción en inglés:** `description_en_override` — si el host escribe su propia versión EN, esa gana siempre sobre la traducción automática de Claude (ver "Sistema de traducciones").
- **En la guía pública:** `/guide/[slug]/recomendaciones` + `RecommendationsPanel.tsx`, agrupado por categoría.
- El sistema legacy `recommendations` (supermarket/pharmacy/transport) sigue vivo en paralelo — cubre necesidades prácticas que `property_recommendations` no contempla, no se ha migrado.

---

## Importar desde Airbnb

- **`AirbnbImportPanel.tsx`** (editor): el host pega la URL de su anuncio de Airbnb → `POST /api/properties/import-airbnb` hace scraping server-side (`og:title`/`og:description` del HTML) con timeout de 8s y un User-Agent de navegador real.
- **Solo dominios `airbnb.*`** — la URL se valida contra ese patrón antes de hacer el fetch, para no convertir el endpoint en un proxy SSRF de URLs arbitrarias.
- **Campos "que parecen auto-generados"** (el resumen que a veces sirve Airbnb como `og:title`, tipo "Rental unit in Seville · ★5.0 · 3 bedrooms") se detectan por regex y **no se preseleccionan** — el host tiene que marcarlos a mano tras revisar, para no aplicar sin querer un texto que no es el nombre real del alojamiento.
- Si Airbnb bloquea el acceso o el anuncio no existe (detectado incluso con HTTP 200, ya que Airbnb sirve el shell de la SPA igual), el panel cae a "rellena los datos manualmente" en vez de fallar en seco.
- Los campos aceptados (nombre, descripción, dirección, huéspedes/habitaciones/baños, horas de check-in/out, normas de la casa) escriben directamente sobre `properties` y crean/actualizan los bloques `checkin`/`checkout`/`rules` correspondientes.

---

## Borrado de propiedades (soft-delete)

- El host nunca borra una propiedad de forma definitiva: `DELETE /api/properties/[id]` marca `deleted_at`/`deleted_by_host_plan` en vez de hacer un `DELETE` real — recuperable por un superadmin.
- **RLS a prueba de fallos:** toda policy `_select_public` que depende de `properties.is_published` (properties, guide_blocks, recommendations, property_recommendations, property_recommendation_meta) se extendió para exigir también `deleted_at is null` — aunque una query pública se olvidara del filtro, RLS nunca serviría una propiedad borrada a un huésped.
- `lib/properties.ts`: `classifyGuideAvailability()` distingue `not_found` / `deleted` / `unpublished` / `available` para que la guía pública muestre un mensaje distinto según el caso, en vez de un 404 genérico. `isPurgeEligible()` marca cuándo una propiedad borrada (`DELETED_PROPERTY_RETENTION_DAYS` = 30 días) ya es candidata a purga definitiva.
- **Panel superadmin (`/admin/properties`):** lista todas las propiedades (activas y borradas), con botones **Restaurar** (`POST /api/admin/properties/[id]/restore`, limpia `deleted_at`/`deleted_by_host_plan`) y **Purgar** (`DELETE /api/admin/properties/[id]/purge`, requiere escribir literalmente `"BORRAR PERMANENTEMENTE"` en el body — verificado también en servidor, no solo en el cliente). Purgar solo funciona sobre una propiedad ya soft-deleted (fuerza el flujo en dos pasos: host borra → admin purga) y borra también la imagen de portada del Storage (los `FK ON DELETE CASCADE` limpian el resto de tablas, pero no los objetos de Storage).

---

## Impersonación de superadmin

- **`POST /api/admin/impersonate`** (`{ userId }`): solo `isSuperAdmin(admin.email)`; bloquea impersonar la propia cuenta y bloquea impersonar a **otro** superadmin. Genera un magic-link server-side (`auth.admin.generateLink({ type: "magiclink" })`) y consume el `hashed_token` inmediatamente con `supabase.auth.verifyOtp()` **en el mismo request** — no se envía ningún link a un navegador, así que este flujo no depende en absoluto de la configuración de Redirect URLs de Supabase (a diferencia del reset de contraseña).
- El `refresh_token` de la sesión del admin se guarda firmado (HMAC con `SUPABASE_SERVICE_ROLE_KEY`) en una cookie httpOnly (`lib/impersonation.ts`), con expiración de 1h.
- **`POST /api/admin/impersonate/stop`**: lee esa cookie, valida la firma y hace `auth.refreshSession()` con el refresh_token guardado para volver a la sesión de admin.
- **`ImpersonationBanner.tsx`**: se muestra mientras la cookie de impersonación está activa, con botón para volver a la cuenta de admin.

---

## Analíticas (plan Pro/Agency)

- `lib/analytics.ts` → `logAnalyticsEvent()`, best-effort (try/catch silencioso — nunca debe romper la guía de un huésped): registra `guide_opened`, `section_viewed`, `whatsapp_clicked` en `analytics_events`, con país aproximado vía el header `x-vercel-ip-country`.
- `POST /api/guide/analytics` es el endpoint que la guía pública llama para disparar estos eventos.
- Panel del host: `/properties/[id]/stats` — el guard `analyticsEnabled` de `lib/plans.ts` decide si el plan actual tiene acceso (Free/Starter no, Pro/Agency sí).

---

## Imprimir QR (PDF "tent card")

- **`GET /api/properties/[id]/qr-print`** genera un PDF A4 descargable con `@react-pdf/renderer` (`lib/pdf/tent-card.tsx`), pensado para imprimir en casa y dejar de pie en el alojamiento.
- **Formato:** el mismo panel (logo, nombre de la propiedad, instrucción de escaneo en ES+EN, QR a 1000px vía `generatePrintQrCodeDataUrl()` en `lib/qr.ts`, franja de puntos naranjas) se repite dos veces en la misma hoja — la mitad inferior rotada 180° sobre su propio centro. Al doblar por la franja central ("· · · dobla aquí · · ·", exactamente en el punto medio físico del A4) el resultado se sostiene solo, en forma de tejadillo, legible desde ambos lados de una mesa — sin necesitar marco ni soporte.
- **Logo sin dependencia de fuentes:** `public/logo.svg` tiene el wordmark "WelcoKit" como `<text>` con una fuente embebida (`Montserrat-Bold` en base64) en la capa visible (`Layer_2_copy`) — pero el mismo archivo trae, oculta (`Layer_3`, `display:none`), una versión ya vectorizada en paths puros del mismo wordmark. `lib/pdf/logo.ts` intercambia qué capa se muestra antes de rasterizar con `sharp`, precisamente porque distintos builds de libvips/librsvg (confirmado: macOS local vs. el contenedor de producción en EasyPanel) no rasterizan igual una fuente embebida — los paths no dependen de ningún motor de fuentes y se ven idénticos en cualquier entorno.
- **Fuentes Inter/Playfair Display** para el resto del texto del PDF están auto-alojadas como `.woff` en `public/fonts/` y registradas en `@react-pdf/renderer` — no reutiliza `next/font/google` porque ese mecanismo es específico del renderer de Next, no del motor de layout de react-pdf.
- Botón "Imprimir QR" en `PublishPanel.tsx`, junto a "Ver código QR".

---

## Landing page pública (marketing)

- **`app/page.tsx`** (homepage) usa `LandingPage.tsx` (`components/landing/`) — bilingüe ES/EN vía el mismo sistema de idioma del dashboard (`next-intl` + cookie `NEXT_LOCALE`), no el de la guía pública.
- Secciones: `LandingHero`, `LandingProblemSolution`, `LandingHowItWorks`, `LandingFeatures`, `LandingPricing`, `LandingFinalCta`, `LandingFooter` — más elementos decorativos (`WaveDivider.tsx`, `HandDrawnMark.tsx`, `GuidePreviewCard.tsx`).
- `LandingPricing.tsx` debe reflejar siempre los precios de `lib/plans.ts` — es la fuente única de verdad, igual que en `/account`.

---

## Idioma del dashboard vs. idioma de la guía pública

Dos sistemas de i18n **completamente independientes** — no comparten cookie, provider ni lógica:

| | Dashboard/landing (panel del anfitrión) | Guía pública (huésped) |
|---|---|---|
| Librería | `next-intl` | Diccionario propio (`lib/guide-i18n.ts`) + `content_translations` |
| Cookie/storage | `NEXT_LOCALE` (`lib/locale.ts`) | `localStorage` (`guide-locale`, vía `GuideLocaleProvider`) |
| Detección inicial | Header `Accept-Language` en `middleware.ts`, solo si no hay cookie aún — español es el único caso especial, todo lo demás cae a inglés | `properties.language` (idioma del anfitrión) por defecto |
| Persistencia tras registro | `profiles.dashboard_locale`, poblado desde el `locale` elegido en el registro (trigger `handle_new_user`) | N/A (es por-huésped, no por-cuenta) |

`middleware.ts` inyecta la cookie de idioma tanto en `request.cookies` como en la response para que el primer render server-side ya salga en el idioma correcto — evita el flash de español-luego-inglés que había antes de mover la detección a middleware.

---

## Diseño / Sistema visual (guía pública)

- **Iconos:** Lucide React, line-style (`strokeWidth={1.5}`), en color `accent_color` de la propiedad (no negro). Mapeo completo en `lib/guide-icons.tsx` — incluye `Waves` (pool), `ShieldAlert` (emergencias), `UtensilsCrossed` (restaurants), `Wine` (drinks), `Music` (nightlife), `Landmark` (attractions).
- **Tipografía:** Playfair Display (serif, `font-serif`) para el nombre del alojamiento en el hero y los títulos `<h1>` de cada sección; Inter (sans, por defecto) para el resto del texto.
- **Tiles del grid principal:** fondo blanco, borde 1px gris muy claro, `border-radius` 16px (`rounded-2xl`), sombra sutil en reposo y más marcada al hover, borde en `accent_color` al hover/tap.
- **Hero:** si hay `cover_image_url`, se usa como fondo con `object-fit: cover` y un degradado oscuro (`transparent → black/70`) limitado a la mitad inferior donde está el texto — el resto de la imagen se ve con su brillo natural. Sin imagen, se mantiene el fondo sólido en `accent_color`.
- **Responsive mobile-first:** grid de tiles a 2 columnas en móvil (`<640px`), 3 columnas desde tablet/desktop (`≥640px`); padding de las páginas de sección escalonado (16px móvil / 24px tablet / 32px desktop).
- Nota: el tema visual del **panel del anfitrión** (dashboard, shadcn/ui) es independiente del `accent_color` por propiedad — usa su propia paleta cálida definida en `app/globals.css` vía variables OKLCH.

---

## Lógica de IA

### 1. Generación de contenido inicial

Cuando el anfitrión crea una propiedad y pulsa "Generar con IA", se llama a `/api/ai/generate-content`:

```typescript
// lib/claude.ts
export async function generateGuideContent(property: {
  name: string
  address: string
  hostTone: 'friendly' | 'formal'
}) {
  const prompt = `
Eres un asistente que ayuda a propietarios de alojamientos turísticos a crear guías para sus huéspedes.

Genera el contenido para la guía del siguiente alojamiento:
- Nombre: ${property.name}
- Dirección: ${property.address}
- Tono del anfitrión: ${property.hostTone === 'friendly' ? 'cercano, tuteo' : 'formal, usted'}

Devuelve SOLO un JSON con esta estructura exacta:
{
  "welcome_message": "Mensaje de bienvenida personalizado (2-3 frases)",
  "checkin_tips": ["tip1", "tip2", "tip3"],
  "checkout_tips": ["tip1", "tip2", "tip3"],
  "rules": ["norma1", "norma2", "norma3", "norma4", "norma5"],
  "neighborhood_description": "Descripción del barrio/zona en 2 frases"
}
`
  // llamada a Claude API (modelo sonnet)
}
```

### 2. Recomendaciones locales (legacy)

> Este flujo vía `/api/ai/recommendations` es el sistema **legacy**, hoy limitado a las 3 categorías de necesidades prácticas (`supermarket`/`pharmacy`/`transport`, tabla `recommendations`). Para `attractions`/`restaurants`/`nightlife`/`beaches`/`nature` (tabla `property_recommendations`), ver "Sistema de recomendaciones locales" — mismo patrón general (Google Places → filtro por calidad → Claude escribe la descripción) pero con generación por categoría, cuota mensual y opción de añadir/editar a mano.

Flujo en `/api/ai/recommendations`:

1. Llamar a Google Places Text Search con la dirección y categoría
2. Filtrar resultados con rating >= 4.0 y user_ratings_total >= 50
3. Pasar los top 5 resultados a Claude con el prompt:

```typescript
const recommendationsPrompt = `
Eres el asistente de ${property.name}, un alojamiento en ${property.address}.

Los huéspedes típicos son: ${guestProfile}

Estos son los ${category} más valorados cerca del alojamiento (datos de Google):
${JSON.stringify(places, null, 2)}

Selecciona los 3 mejores y escribe una descripción breve (máximo 2 frases) para cada uno.
La descripción debe ser útil y personal, no un resumen genérico.
Menciona algo específico: qué pedir, cuándo ir, qué hace especial al lugar.

Devuelve SOLO un JSON array:
[
  {
    "place_id": "...",
    "description": "..."
  }
]
`
```

### 3. Bot de WhatsApp

El prompt del bot se construye dinámicamente a partir del contenido de la guía:

```typescript
// lib/whatsapp/bot.ts
export function buildSystemPrompt(property: Property, blocks: GuideBlock[], recommendations: Recommendation[]) {
  return `
Eres el asistente virtual del alojamiento "${property.name}", ubicado en ${property.address}.
Respondes preguntas de los huéspedes que están alojados aquí.

Tono: ${property.host_tone === 'friendly' ? 'Cercano y amable, tutea al huésped' : 'Profesional y cortés'}
Idioma: Responde siempre en ${property.language === 'es' ? 'español' : 'el idioma del huésped'}

INFORMACIÓN DEL ALOJAMIENTO:
${blocks.map(block => formatBlock(block)).join('\n\n')}

RECOMENDACIONES CERCANAS:
${recommendations.map(r => `- ${r.name} (${r.category}): ${r.description}. Distancia: ~${Math.round(r.distance_meters / 100) * 100}m`).join('\n')}

INSTRUCCIONES:
- Responde SOLO con información que está en este contexto
- Si el huésped pregunta algo que no está aquí, dile amablemente que contacte con el anfitrión directamente
- Sé conciso — máximo 3-4 frases por respuesta
- No inventes información
- Para recomendaciones de restaurantes, menciona la distancia a pie
`
}
```

### 4. Traducción de la guía pública

Ver sección "Sistema de traducciones" arriba — usa `claude-haiku-4-5-20251001` en vez de `sonnet`, pre-generada en background al guardar y cacheada en `content_translations`, con fallback síncrono vía `/api/guide/translate-block`.

---

## Modelo de costes de IA

- Todas las llamadas de IA (generación de contenido, recomendaciones, bot, traducciones) se hacen con la **API key de Anthropic del propietario del SaaS** — el anfitrión nunca aporta su propia clave.
- La caché agresiva de traducciones en BD (global entre anfitriones) es la principal palanca de ahorro: una norma común como "No fumar" solo se traduce una vez en la vida del sistema, sin importar cuántas propiedades la usen.
- `claude-haiku-4-5` para traducciones (20x más barato que sonnet, calidad suficiente para textos cortos); `claude-sonnet-4-6` reservado para generación de contenido y recomendaciones, donde la calidad del texto importa más.
- Coste estimado con caché caliente: **<0.01€/propiedad/mes** en traducciones — al pre-generarse una vez por bloque al guardar (no por visita de huésped), el volumen de llamadas a Claude ya es intrínsecamente bajo y no necesita rate limiting como red de seguridad adicional.

---

## Modelo de negocio

**`lib/plans.ts` es la fuente única de verdad** para precios, límites y guards de cada plan — no hardcodear estos valores en ningún otro sitio (páginas, componentes, endpoints). `types/index.ts` define `Plan = "free" | "starter" | "pro" | "agency"`, y `profiles.plan` está restringido a esos 4 valores por constraint en BD.

| Plan | Precio | Propiedades | IA (contenido/recomendaciones) | Estadísticas | Marca blanca | Regeneraciones manuales/mes |
|------|--------|--------------|------------------------------|--------------|--------------|------------------------------|
| Free | 0€/mes | 1 | ❌ | ❌ | ❌ | 1 |
| Starter | 5€/mes | 3 | ✅ | ❌ | ❌ | 3 |
| Pro | 12€/mes | 10 | ✅ | ✅ | ❌ | 10 |
| Agency | 29€/mes | 30 | ✅ | ✅ | ✅ | 25 |

- `getPlan(planId)` / `planPropertyLimit(planId)` en `lib/plans.ts` — usado por `/api/properties` (POST) para bloquear la creación de propiedades por encima del límite del plan, y por el modal "Cambiar de plan" (`ChangePlanDialog.tsx`) y `/account` para mostrar precio y features.
- Los guards `aiEnabled` / `analyticsEnabled` / `whiteLabel` de `lib/plans.ts` describen qué debería estar disponible por plan; **todavía no hay enforcement de estos guards en el código** (p. ej. no se oculta el botón "Generar con IA" en plan Free) — son la fuente de verdad para cuando se implemente esa restricción.
- **Cambio de plan:** desde `/account`, `ChangePlanDialog.tsx` — si el anfitrión ya tiene un plan de pago activo, muestra un único botón "Gestionar suscripción" que abre el Stripe Customer Portal (cancelar, cambiar método de pago, ver facturas); si está en `free`, muestra los 3 planes de pago con botón "Actualizar" que abre Stripe Checkout. `profiles.plan` se actualiza siempre desde el webhook (`app/api/stripe/webhook/route.ts`, service-role), nunca directamente desde el cliente — ver sección "Pagos (Stripe)" más abajo.
- **Panel de superadmin** (`/admin`, `lib/admin.ts`): acceso restringido al email `ignajac@gmail.com` (redirige a `/login` para cualquier otro usuario, autenticado o no). `/admin` (`AdminHostsTable.tsx`) lista todos los anfitriones (email vía `auth.admin.listUsers()`, plan, nº de propiedades, fecha de registro), permite cambiar el plan de cualquier anfitrión con un select (`PATCH /api/admin/profiles/[id]/plan`, revalida el email en el servidor además de en la página), botón para impersonar la cuenta de ese host (ver "Impersonación de superadmin"), y estadísticas globales (anfitriones, propiedades totales, publicadas vs borrador). `/admin/properties` (`AdminPropertiesTable.tsx`) añade el restore/purge de propiedades soft-deleted (ver "Borrado de propiedades"). Los cambios manuales de plan **no** tocan Stripe (solo la BD) — pensados para casos de soporte, no para el flujo normal del anfitrión.

---

## Pagos (Stripe)

- **Cliente:** `lib/stripe.ts` — instancia única server-side (`stripe`, usa `STRIPE_SECRET_KEY`) y un singleton client-side (`getStripeJs()`, vía `@stripe/stripe-js` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`). El singleton client-side no se usa hoy para el redirect (ver checkout abajo) — queda preparado por si en el futuro se usa Stripe Elements/Embedded Checkout.
- **Checkout** (`POST /api/stripe/create-checkout-session`): recibe `{ plan: "starter" | "pro" | "agency" }`, crea un `stripe.customers` si el anfitrión no tiene `profiles.stripe_customer_id` todavía (y lo guarda), crea una `checkout.sessions` en modo `subscription` con el price ID correspondiente (`lib/stripe.ts` → `getPlanPriceId()`), y devuelve `{ url }`. El cliente hace `window.location.href = url` — se usa la `url` de la Checkout Session directamente (recomendado por Stripe), no `redirectToCheckout(sessionId)`. `success_url` → `/dashboard?upgraded=true` (muestra un toast de confirmación vía `UpgradedToast.tsx` y limpia la query string), `cancel_url` → `/account`.
- **Portal de cliente** (`POST /api/stripe/create-portal-session`): requiere `profiles.stripe_customer_id`; crea una `billingPortal.sessions` con `return_url` → `/account`. Desde ahí el anfitrión cancela/cambia su suscripción sin que la app tenga que implementar esa UI.
- **Webhook** (`POST /api/stripe/webhook`, ya existente, actualizado): verifica la firma con `STRIPE_WEBHOOK_SECRET` y maneja:
  - `checkout.session.completed` → recupera la subscription creada, mapea su price ID a un plan, y actualiza `profiles.plan` + `profiles.stripe_customer_id` (busca la fila por `stripe_customer_id`, que ya se guardó al crear el customer en el paso de checkout).
  - `customer.subscription.updated` → recalcula el plan según el price ID actual de la subscription; si el status no es `active`/`trialing` (p. ej. `past_due`, `unpaid`), degrada a `free`.
  - `customer.subscription.deleted` → siempre degrada a `free`.
  - Todas las escrituras usan `createServiceRoleClient()` — el webhook no tiene sesión de usuario, solo la firma de Stripe como autenticación.
- **Mapeo price ID → plan:** `lib/stripe.ts` → `getPlanPriceId()` / `getPriceIdToPlan()`, leído de `STRIPE_STARTER_PRICE_ID` / `STRIPE_PRO_PRICE_ID` / `STRIPE_AGENCY_PRICE_ID` — nunca hardcodeado en el código, solo en `.env.local`.
- **Desarrollo local:** el webhook necesita un secreto distinto al de producción. Con la Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook` imprime un `whsec_...` que va en `STRIPE_WEBHOOK_SECRET` de `.env.local`; hay que dejar ese comando corriendo en una terminal mientras se prueba el flujo de checkout en local.

---

## Comandos de desarrollo

```bash
# Instalar dependencias
npm install

# Variables de entorno necesarias
cp .env.example .env.local
# Rellenar: ANTHROPIC_API_KEY, GOOGLE_MAPS_SERVER_KEY, NEXT_PUBLIC_SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY, YCLOUD_API_KEY, RESEND_API_KEY,
# STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET,
# STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_AGENCY_PRICE_ID

# Desarrollo local
npm run dev

# Supabase local
npx supabase start
npx supabase db reset   # Aplica todas las migrations

# Aplicar migraciones nuevas al proyecto remoto
npx supabase db push

# Deploy — EasyPanel redespliega solo con cada push a main (auto deploy activado):
# 1. git push origin main
# 2. (Si hiciera falta forzarlo) panel de EasyPanel, servicio "welcokit", botón "Deploy"
```

---

## Convenciones de código

- **Componentes:** PascalCase, un componente por archivo
- **API routes:** kebab-case, validación con Zod en todas las rutas
- **Tipos:** Definir interfaces en `/types/index.ts`, derivar tipos de Supabase con `Database` type
- **Errores:** Siempre retornar `{ error: string }` con el status HTTP correcto
- **Variables de entorno:** Prefijo `NEXT_PUBLIC_` solo para lo que necesite el cliente
- **Imágenes:** Subir a Supabase Storage, nunca al repositorio
- **Textos de la guía pública:** nunca hardcodear strings ES/EN en componentes — añadir la clave en `lib/guide-i18n.ts`. Los tipos de bloque conocidos usan `t("block_<tipo>")`; solo el contenido libre (custom, welcome_message, descripciones de recomendaciones) se traduce vía `content_translations` (pre-generada al guardar, con fallback en `/api/guide/translate-block`)

---

## Flujo principal del usuario (anfitrión)

1. Registro → onboarding de 3 pasos (nombre del alojamiento, dirección, foto), o importa los datos directamente desde su anuncio de Airbnb
2. La IA genera el borrador de contenido automáticamente
3. El anfitrión revisa/edita los bloques en el editor visual
4. Genera recomendaciones locales por categoría (qué visitar, dónde comer, ocio nocturno, y playas/naturaleza si se detectan cerca) → revisa, edita, añade alguna a mano o descarta las que no le gusten
5. Sube imagen de portada y configura su número de WhatsApp desde el panel de Publicación
6. Publica → obtiene URL única + QR descargable en pantalla + PDF imprimible tipo "tent card" para dejar de pie en el alojamiento
7. (Pro/Agency) El bot de WhatsApp queda activo con el número configurado, y accede a las estadísticas de visitas de la guía

## Flujo del huésped

1. Escanea QR o recibe enlace por WhatsApp/email al hacer check-in
2. Accede a la guía sin registro, en su idioma (ES/EN, con traducción automática de contenido libre)
3. Navega por tiles → consulta info del apartamento
4. En WiFi, escanea el QR de conexión automática y marca "Ya estoy conectado"
5. (Pro) Escribe por WhatsApp → el bot responde automáticamente, o usa el botón flotante de WhatsApp para contactar directamente con el anfitrión

---

## Notas importantes

- El slug de la guía debe ser único y generarse a partir del nombre del alojamiento (slugify)
- Las guías deben funcionar offline (PWA / Service Worker) para huéspedes sin buena conexión
- RLS de Supabase: los anfitriones solo acceden a sus propias propiedades; `content_translations` no tiene políticas públicas — solo se lee/escribe desde el servidor con `createServiceRoleClient()`
- El webhook de YCloud se conecta al n8n self-hosted en ia.neurodatos.com
- Google Places API tiene coste por llamada — implementar caché en Supabase (TTL 30 días por localización)
- El número de WhatsApp del bot es el de YCloud — el anfitrión no da su número personal al bot, solo para el botón directo (`whatsapp_number` en `properties`)
- La caché de traducciones (`content_translations`) es por propiedad+bloque, no global entre anfitriones (a diferencia de la antigua `translations_cache`) — cada propiedad genera su propia traducción una vez, sin TTL
- El deploy a producción **es automático** desde 2026-10-25: un `git push` a `main` redespliega en EasyPanel (ver "Comandos de desarrollo"). Las migraciones de Supabase NO se aplican solas
