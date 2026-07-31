-- Security hardening applied after Supabase Security Advisor alert.
-- Keeps every exposed public table protected by Row Level Security.

alter table public."PropertyCache" enable row level security;
alter table public."SeoKeyword" enable row level security;
alter table public."SeoPage" enable row level security;
alter table public."SeoSearchMetric" enable row level security;
alter table public."SeoUrlInspection" enable row level security;
alter table public."Service" enable row level security;

drop policy if exists tenant_isolation_property_cache on public."PropertyCache";
create policy tenant_isolation_property_cache
on public."PropertyCache"
for all
to public
using ("tenantId" = current_setting('app.tenant_id', true));

drop policy if exists tenant_isolation_seo_keyword on public."SeoKeyword";
create policy tenant_isolation_seo_keyword
on public."SeoKeyword"
for all
to public
using ("tenantId" = current_setting('app.tenant_id', true));

drop policy if exists tenant_isolation_seo_page on public."SeoPage";
create policy tenant_isolation_seo_page
on public."SeoPage"
for all
to public
using ("tenantId" = current_setting('app.tenant_id', true));

drop policy if exists tenant_isolation_seo_search_metric on public."SeoSearchMetric";
create policy tenant_isolation_seo_search_metric
on public."SeoSearchMetric"
for all
to public
using ("tenantId" = current_setting('app.tenant_id', true));

drop policy if exists tenant_isolation_seo_url_inspection on public."SeoUrlInspection";
create policy tenant_isolation_seo_url_inspection
on public."SeoUrlInspection"
for all
to public
using ("tenantId" = current_setting('app.tenant_id', true));

drop policy if exists service_catalog_read on public."Service";
create policy service_catalog_read
on public."Service"
for select
to anon, authenticated
using (true);
