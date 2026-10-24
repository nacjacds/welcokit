-- Caché del PDF imprimible de la guía premium (Playwright, ver
-- lib/premium-guide/pdf.ts). El PDF se guarda en Storage y se regenera de
-- forma perezosa: está obsoleto si pdf_generated_at < guides.updated_at.
alter table guides
  add column pdf_path text,
  add column pdf_generated_at timestamptz;

-- Privado: el PDF lleva la dirección del alojamiento; solo se sirve desde el
-- servidor (endpoint del anfitrión) con URL firmada o en streaming.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guide-pdfs', 'guide-pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- Cualquier edición de una sección o de un lugar marca la guía como
-- modificada, así el PDF cacheado queda obsoleto sin que cada punto de
-- edición (importador, editor de la fase 4...) tenga que acordarse.
create or replace function touch_guide_updated_at() returns trigger
language plpgsql as $$
declare
  target_guide uuid;
begin
  if tg_table_name = 'guide_sections' then
    target_guide := coalesce(new.guide_id, old.guide_id);
  else
    select guide_id into target_guide
    from guide_sections
    where id = coalesce(new.section_id, old.section_id);
  end if;

  if target_guide is not null then
    update guides set updated_at = now() where id = target_guide;
  end if;
  return null;
end;
$$;

create trigger guide_sections_touch_guide
  after insert or update or delete on guide_sections
  for each row execute function touch_guide_updated_at();

create trigger guide_places_touch_guide
  after insert or update or delete on guide_places
  for each row execute function touch_guide_updated_at();
