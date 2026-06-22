-- RLS defensivo para tabelas multi-tenant.
-- O backend Prisma usa credencial server-side; acesso direto anon/authenticated fica isolado por app.tenant_id.
-- Para clientes externos via Supabase direto, defina `set_config('app.tenant_id', '<tenant-id>', true)` no contexto da conexao.

alter table "Tenant" enable row level security;
alter table "User" enable row level security;
alter table "TenantSettings" enable row level security;
alter table "TenantService" enable row level security;
alter table "AuditLog" enable row level security;
alter table "Lead" enable row level security;
alter table "LeadInteraction" enable row level security;
alter table "PublicationLog" enable row level security;
alter table "SocialPublication" enable row level security;
alter table "google_business_posts" enable row level security;
alter table "PaymentRecord" enable row level security;
alter table "Job" enable row level security;
alter table "JobAttempt" enable row level security;
alter table "Asset" enable row level security;
alter table "BlogPost" enable row level security;
alter table "BlogProfile" enable row level security;
alter table "SeoSite" enable row level security;
alter table "SeoSitemapUrl" enable row level security;
alter table "SeoCredential" enable row level security;
alter table "SeoRecommendation" enable row level security;
alter table "TenantWebhookSecret" enable row level security;

drop policy if exists tenant_isolation_tenant on "Tenant";
create policy tenant_isolation_tenant on "Tenant" using (id = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_user on "User";
create policy tenant_isolation_user on "User" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_tenant_settings on "TenantSettings";
create policy tenant_isolation_tenant_settings on "TenantSettings" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_tenant_service on "TenantService";
create policy tenant_isolation_tenant_service on "TenantService" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_audit_log on "AuditLog";
create policy tenant_isolation_audit_log on "AuditLog" using ("tenantId" = current_setting('app.tenant_id', true));

drop policy if exists tenant_isolation_lead on "Lead";
create policy tenant_isolation_lead on "Lead" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_lead_interaction on "LeadInteraction";
create policy tenant_isolation_lead_interaction on "LeadInteraction" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_publication_log on "PublicationLog";
create policy tenant_isolation_publication_log on "PublicationLog" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_social_publication on "SocialPublication";
create policy tenant_isolation_social_publication on "SocialPublication" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_gbp on "google_business_posts";
create policy tenant_isolation_gbp on "google_business_posts" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_payment on "PaymentRecord";
create policy tenant_isolation_payment on "PaymentRecord" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_job on "Job";
create policy tenant_isolation_job on "Job" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_job_attempt on "JobAttempt";
create policy tenant_isolation_job_attempt on "JobAttempt" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_asset on "Asset";
create policy tenant_isolation_asset on "Asset" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_blog_post on "BlogPost";
create policy tenant_isolation_blog_post on "BlogPost" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_blog_profile on "BlogProfile";
create policy tenant_isolation_blog_profile on "BlogProfile" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_seo_site on "SeoSite";
create policy tenant_isolation_seo_site on "SeoSite" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_seo_sitemap_url on "SeoSitemapUrl";
create policy tenant_isolation_seo_sitemap_url on "SeoSitemapUrl" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_seo_credential on "SeoCredential";
create policy tenant_isolation_seo_credential on "SeoCredential" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_seo_recommendation on "SeoRecommendation";
create policy tenant_isolation_seo_recommendation on "SeoRecommendation" using ("tenantId" = current_setting('app.tenant_id', true));
drop policy if exists tenant_isolation_webhook_secret on "TenantWebhookSecret";
create policy tenant_isolation_webhook_secret on "TenantWebhookSecret" using ("tenantId" = current_setting('app.tenant_id', true));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-assets', 'tenant-assets', true, 10485760, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists tenant_assets_public_read on storage.objects;
create policy tenant_assets_public_read on storage.objects
  for select using (bucket_id = 'tenant-assets');
