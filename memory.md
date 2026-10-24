# Memoria del proyecto — WelcoKit

Estado vivo del proyecto para retomar el trabajo sin repasar el historial. Léelo al empezar una sesión y consulta
`CLAUDE.md` (arquitectura, tablas, convenciones) para el resto.

**Cómo se mantiene:**
- La sección *Estado automático* se regenera sola al terminar cada respuesta (`scripts/actualizar-memory.py`, hook Stop de
  `.claude/settings.json`). No la edites a mano.
- Las demás secciones las actualiza Claude al terminar cualquier tarea que cambie el proyecto (regla en `CLAUDE.md`).
- El repo es público: no pongas aquí claves, teléfonos, direcciones privadas ni datos de huéspedes.

## Estado automático

<!-- AUTO:INICIO -->
_Actualizado automáticamente: 2026-10-24 23:59_

- **Rama:** `main` · commits locales sin subir a origin/main: **3**
- **Cambios sin commitear:** 2 (memory.md, n8n/workflows/supabase-keepalive.json)
- **Última migración en el repo:** `20260723090000_premium_guides.sql`

**Últimos commits:**
- `4147da9` 2026-10-24 — Fix memory script dropping first char of status paths
- `b4f9992` 2026-10-24 — Add auto-updated memory.md (Stop hook) and project memory rule
- `30ba344` 2026-10-24 — Premium guides phase 1: schema migration, nl guide locale, import script
- `22d946e` 2026-08-15 — Make guest-link button more visible with brand orange styling and clearer copy in 5 locales
- `eadde43` 2026-07-22 — Fix block creation broken for fr/it/pt locales; make standard block titles derive dynamically instead of freezing at creation
- `2fd6290` 2026-07-21 — Landing copy: remove em dashes, clarify host-facing product from the hero, add natural SEO keywords in 5 locales
- `4b032be` 2026-07-21 — Analytics: exclude host IPs (configurable), capture city/country without storing raw IP, update privacy policy
- `a38f7b3` 2026-07-21 — Add destination_type-aware Places search and Claude curation for more relevant recommendations
- `516942e` 2026-07-20 — Fix: admin plan selector showed raw value instead of proper label (same Select bug as content language)
- `867edb8` 2026-07-20 — Add content language selector to property settings, with clarifying warning about no auto-translation
- `c125833` 2026-07-20 — Default new property's content language to host's dashboard_locale instead of hardcoded 'es'
- `2acb5c6` 2026-07-20 — i18n Fase 5: translate legal pages to EN/FR/IT/PT, unify address, localize footer links
- `1a0b7bf` 2026-07-20 — i18n Fase 4: translate dashboard/landing/auth messages to French, Italian, Portuguese
- `0bd4ec6` 2026-07-20 — Fix: translate WiFi QR alt text (was hardcoded in Spanish for all locales)
- `0fe9fea` 2026-07-20 — i18n Fase 3: translate guide public UI strings to French, Italian, Portuguese
<!-- AUTO:FIN -->

## Guía premium (`welcokit.guide/v1`) — en curso

Integración de las guías ilustradas hechas a mano (Sol Muralla, Carihuela Cristal) como tipo nuevo `source = 'premium'`. El kit vive en
`docs/guides-kit/` (**ignorado por git**: lleva datos privados y 29 MB de PDF). Plan por fases en `docs/guides-kit/PROMPT_ANTIGRAVITY.md`.

- **Fase 0 (plan): hecha.** Convive con `guide_blocks`/`property_recommendations`: si hay fila en `guides` para (propiedad, idioma) la guía
  pública pinta la premium; si no, la de siempre.
- **Fase 1 (datos): hecha y commiteada (sin push).** Migración `20260723090000_premium_guides.sql` (`guides`, `guide_sections`, `places`,
  `guide_places`; buckets `guide-assets` público y `guide-private`), idioma `nl` en la guía pública (`GuideLocale`, no en el panel) y
  `scripts/import-guides.ts` (`npm run import-guides`, flags `--dry-run --only --property --geocode --skip-assets`).
  **Aplicada a mano en el SQL Editor de Supabase** (el CLI no tiene acceso a ese proyecto): si algún día se enlaza el CLI,
  `supabase migration repair --status applied 20260723090000` antes de `db push`. Importadas 8 guías, 88 secciones, 83 lugares, 332 fichas.
- **Pendiente:** Fase 2 (vista web responsive), 3 (PDF con Playwright), 4 (editor "Guía premium"), 5 (few-shot en la IA).

**Decisiones**
- Las tablas premium no tienen policies anon: el huésped lee desde el servidor con service role. El dueño tiene CRUD vía `properties.host_id`.
- Los lugares (`places`) se identifican por el JSON en inglés `(city, name)` y los otros idiomas se alinean por sección+posición, porque los nombres se traducen.
- `reviewed_by_native`: true en EN/ES, false en FR/NL. La foto real del salón va al bucket privado (`private:guide-private/...`) y se firma al servir.
- Reimportar sobrescribe el contenido premium con el del JSON (pisaría ediciones del anfitrión de la Fase 4).

**Gotchas**
- `carihuela-cristal` sección `tips`: EN tiene 15 bloques y ES/FR/NL 16 (falta el `signoff` en EN). Sin resolver.
- Lugares sin geocodificar (`lat/lng/google_place_id` vacíos): `--geocode` necesita `GOOGLE_MAPS_SERVER_KEY` en `.env.local`.
- El panel del anfitrión NO tiene `nl` (`AppLocale`, `messages/`, CHECK de `profiles.dashboard_locale`); solo la guía pública.
- Añadir `nl` a `ALL_GUIDE_LOCALES` hace que cada guardado lance una traducción más a Haiku.

## n8n

- `n8n/workflows/supabase-keepalive.json`: ping cada 3 días a `properties` para que Supabase no pause el proyecto por inactividad.
  Sin commitear; hay que pegar a mano en n8n `PEGA_AQUI_LA_URL_DE_SUPABASE` y `PEGA_AQUI_LA_ANON_KEY`.
