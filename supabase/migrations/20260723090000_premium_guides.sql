-- "Guía premium" (formato welcokit.guide/v1): guías ilustradas con lugares
-- reales de Google, hechas a mano (source = 'premium') o generadas por la IA
-- siguiendo el mismo esquema (source = 'ai'). Conviven con guide_blocks y
-- property_recommendations, que no se tocan: si existe una fila en `guides`
-- para (propiedad, idioma), la guía pública pinta la vista premium; si no,
-- la guía de siempre.
--
-- Sin policies anon/públicas, igual que content_translations: el huésped lee
-- siempre desde el servidor con createServiceRoleClient(), tras resolver el
-- slug o el enlace personalizado (guest_guide_links) y comprobar publicación,
-- soft-delete y caducidad. El anfitrión dueño lee y escribe vía RLS.

create table guides (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  language text not null check (language in ('es', 'en', 'fr', 'it', 'pt', 'nl')),
  schema text not null default 'welcokit.guide/v1',
  property_info jsonb not null default '{}',   -- name, city, address, hosts, whatsapp del documento
  cover jsonb not null,                        -- GuideCover
  toc jsonb not null default '[]',             -- TocEntry[]
  theme jsonb,
  map_image text,
  map_note text,
  source text not null default 'premium' check (source in ('premium', 'ai')),
  reviewed_by_native boolean not null default false,
  ratings_checked_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, language)
);

create table guide_sections (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guides(id) on delete cascade,
  section_key text not null,                   -- estable entre idiomas: corner, breakfast, tapas...
  position integer not null,
  title text not null,
  kicker text,
  intro_html text,
  illustration text,
  banner_image text,
  is_visible boolean not null default true,
  -- Bloques que no son "place" (callout, text, contact, emergency_*...). Cada
  -- uno lleva su "position" dentro de la sección, intercalada con la de
  -- guide_places, para reconstruir el orden original.
  blocks jsonb not null default '[]',
  unique (guide_id, section_key)
);

create index guide_sections_guide_id_idx on guide_sections(guide_id);

-- Lugares reales, compartidos entre idiomas (y entre secciones). La nota y el
-- número de reseñas son datos de Google, no del texto de la guía.
create table places (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique,
  name text not null,
  address_hint text,
  city text not null,
  lat double precision,
  lng double precision,
  rating numeric(2, 1),
  reviews_label text,                          -- "14,900+", tal cual se muestra
  rating_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (city, name)
);

create table guide_places (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references guide_sections(id) on delete cascade,
  place_id uuid not null references places(id),
  position integer not null,
  icon text,
  walk_minutes integer,
  distance_label text,
  tags text[] not null default '{}',
  description_html text not null,
  host_tip_html text,
  accent_color text,
  is_visible boolean not null default true,
  unique (section_id, position)
);

create index guide_places_section_id_idx on guide_places(section_id);
create index guide_places_place_id_idx on guide_places(place_id);

alter table guides enable row level security;
alter table guide_sections enable row level security;
alter table guide_places enable row level security;
alter table places enable row level security;

-- Anfitrión dueño: CRUD completo sobre sus guías, resuelto a través de la
-- propiedad (mismo patrón que guest_guide_links).
create policy "guides_owner_all"
  on guides for all
  to authenticated
  using (
    exists (
      select 1 from properties
      where properties.id = guides.property_id
      and properties.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from properties
      where properties.id = guides.property_id
      and properties.host_id = auth.uid()
    )
  );

create policy "guide_sections_owner_all"
  on guide_sections for all
  to authenticated
  using (
    exists (
      select 1 from guides
      join properties on properties.id = guides.property_id
      where guides.id = guide_sections.guide_id
      and properties.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from guides
      join properties on properties.id = guides.property_id
      where guides.id = guide_sections.guide_id
      and properties.host_id = auth.uid()
    )
  );

create policy "guide_places_owner_all"
  on guide_places for all
  to authenticated
  using (
    exists (
      select 1 from guide_sections
      join guides on guides.id = guide_sections.guide_id
      join properties on properties.id = guides.property_id
      where guide_sections.id = guide_places.section_id
      and properties.host_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from guide_sections
      join guides on guides.id = guide_sections.guide_id
      join properties on properties.id = guides.property_id
      where guide_sections.id = guide_places.section_id
      and properties.host_id = auth.uid()
    )
  );

-- places es un catálogo compartido (datos públicos de Google): los hosts lo
-- leen para pintar su editor, pero solo el service role lo escribe (importación
-- y refresco de notas), así un host no puede alterar un lugar usado por otro.
create policy "places_select_authenticated"
  on places for select
  to authenticated
  using (true);

-- Assets de las guías premium (iconos, escenas, mapas). Público para lectura;
-- sin policies de escritura: solo se sube con service role (scripts/import-guides.ts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guide-assets', 'guide-assets', true, 5242880,
  array['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Fotos reales de la propiedad (p. ej. la vista desde el salón): privado,
-- se sirve con URL firmada desde el servidor para no exponerla en un bucket
-- público.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guide-private', 'guide-private', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
