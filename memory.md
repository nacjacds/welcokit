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
_Actualizado automáticamente: 2026-10-25 00:30_

- **Rama:** `main` · commits locales sin subir a origin/main: **0**
- **Cambios sin commitear:** 1 (memory.md)
- **Última migración en el repo:** `20260723090000_premium_guides.sql`

**Últimos commits:**
- `f17b3fa` 2026-10-25 — Update memory.md auto state
- `5729b8c` 2026-10-25 — Docs: auto deploy now enabled in EasyPanel
- `d35e2da` 2026-10-24 — Add n8n workflow to keep Supabase project alive
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
- **Fase 2 (vista web): hecha y commiteada (sin push).** `lib/premium-guide/` (fetch con service role + URLs firmadas del bucket privado, sanitizador HTML, fuentes Poppins/Lora) y `components/premium-guide/` (portada, índice, PlaceCard, Callout, urgencias). `app/guide/[slug]/page.tsx` y `app/guide/link/[token]/page.tsx` pintan la premium si hay filas en `guides`; si no, la guía de siempre. Probada en local en móvil y escritorio. `guides.map_note` es una nota interna del kit, no se muestra. **Ojo:** las dos propiedades de prueba están publicadas, así que al desplegar se ven ya en producción.
- **Pendiente:** Fase 3 (PDF con Playwright), 4 (editor "Guía premium"), 5 (few-shot en la IA).

**Decisiones**
- Las tablas premium no tienen policies anon: el huésped lee desde el servidor con service role. El dueño tiene CRUD vía `properties.host_id`.
- Los lugares (`places`) se identifican por el JSON en inglés `(city, name)` y los otros idiomas se alinean por sección+posición, porque los nombres se traducen.
- `reviewed_by_native`: true en EN/ES, false en FR/NL. La foto real del salón va al bucket privado (`private:guide-private/...`) y se firma al servir.
- Reimportar sobrescribe el contenido premium con el del JSON (pisaría ediciones del anfitrión de la Fase 4).

**Modelo de producto (decidido 2026-10-25):** primero "Guía premium hecha por nosotros" (servicio: cuota de alta + suscripción; WelcoKit la muestra y la edita); después borrador con IA (Google Places + estilo premium) que se revisa a mano; autoservicio completo solo si hay demanda. La Fase 5 (IA) no basta para generar una guía entera: la orientación desde el portal, las distancias reales y el "Nuestro consejo" los aporta el anfitrión/equipo.

**Gotchas**
- `carihuela-cristal` sección `tips`: EN tiene 15 bloques y ES/FR/NL 16 (falta el `signoff` en EN). Sin resolver.
- Lugares sin geocodificar (`lat/lng/google_place_id` vacíos): `--geocode` necesita `GOOGLE_MAPS_SERVER_KEY` en `.env.local`.
- El panel del anfitrión NO tiene `nl` (`AppLocale`, `messages/`, CHECK de `profiles.dashboard_locale`); solo la guía pública.
- Añadir `nl` a `ALL_GUIDE_LOCALES` hace que cada guardado lance una traducción más a Haiku.

## Deploy

- Auto deploy activado en EasyPanel (2026-10-25): cada push a `main` redespliega. Las migraciones de Supabase se aplican aparte.

## n8n

- `n8n/workflows/supabase-keepalive.json`: ping cada 3 días a `properties` para que Supabase no pause el proyecto por inactividad.
  Sin commitear; hay que pegar a mano en n8n `PEGA_AQUI_LA_URL_DE_SUPABASE` y `PEGA_AQUI_LA_ANON_KEY`.
