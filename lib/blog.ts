import type { BlogProfile } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readTenantSettings } from "@/lib/settings";

export type BlogProfileInput = {
  companyName?: string;
  legalName?: string;
  creci?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  siteUrl?: string;
  blogUrl?: string;
  googleBusinessUrl?: string;
  instagramUrl?: string;
  institutionalText?: string;
  differentials?: string;
  services?: string;
  propertyTypes?: string;
  regions?: string;
  keywords?: string;
  forbiddenTopics?: string;
  tone?: string;
  targetAudience?: string;
  sigaImobiliariaSlug?: string;
  sigaIdImob?: number;
  sigaIdUsuario?: number;
  sigaIdCategoria?: number;
  defaultStatus?: number;
  mostrarData?: number;
};

export type BlogGenerationInput = {
  topic?: string;
  intent?: string;
  region?: string;
  propertyType?: string;
  publishStatus?: number;
};

const cleanText = (value: unknown) => String(value ?? "").trim();
const cleanNumber = (value: unknown, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
};

export type SigaBlogIntegration = {
  tokenConfigured: boolean;
  settingsEndpoint: string;
  publishEndpoint: string;
  detectedSlug: string;
  source: "blog-profile" | "siga-endpoint" | "tenant-slug" | "missing";
};

export function normalizeSlug(value: string) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 95)
    .replace(/-+$/g, "");
}

function splitList(value: string) {
  return cleanText(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function escapeHtml(value: string) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstListItem(value: string, fallback: string) {
  return splitList(value)[0] || cleanText(value).split(/\s+e\s+|\//i)[0]?.trim() || fallback;
}

function naturalTerm(value: string, fallback: string) {
  const raw = firstListItem(value, fallback).toLowerCase().replace(/\s+/g, " ").trim();
  const map: Record<string, string> = {
    apartamentos: "apartamento",
    apartamento: "apartamento",
    casas: "casa",
    casa: "casa",
    terrenos: "terreno",
    terreno: "terreno",
    coberturas: "cobertura",
    cobertura: "cobertura",
    imoveis: "imóvel",
    imóveis: "imóvel",
    "imoveis de alto padrao": "imóvel de alto padrão",
    "imóveis de alto padrão": "imóvel de alto padrão"
  };
  return map[raw] || raw || fallback;
}

function pluralTerm(value: string) {
  const term = naturalTerm(value, "imóvel");
  const map: Record<string, string> = {
    apartamento: "apartamentos",
    casa: "casas",
    terreno: "terrenos",
    cobertura: "coberturas",
    imóvel: "imóveis",
    "imóvel de alto padrão": "imóveis de alto padrão"
  };
  return map[term] || term;
}

function titleCaseLocation(value: string, fallback: string) {
  const raw = firstListItem(value, fallback).toLowerCase().replace(/\s+/g, " ").trim();
  const smallWords = new Set(["de", "da", "do", "das", "dos", "e"]);
  return raw
    .split(" ")
    .map((word, index) => (index > 0 && smallWords.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

function sentenceSummary(value: string, fallback: string, maxSentences = 2) {
  const clean = cleanText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return fallback;
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return sentences.slice(0, maxSentences).join(" ").trim();
}

function bulletItems(value: string, fallback: string[]) {
  const candidates = cleanText(value)
    .replace(/<[^>]*>/g, "\n")
    .split(/\n|;|•| - /)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 18 && item.length <= 180)
    .slice(0, 4);
  return candidates.length ? candidates : fallback;
}

function digitsOnly(value: string) {
  return cleanText(value).replace(/\D/g, "");
}

function whatsappUrl(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function containsAny(haystack: string, terms: string[]) {
  const normalized = haystack.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function extractSigaImobiliariaSlug(endpoint: string) {
  const value = cleanText(endpoint);
  if (!value) return "";

  try {
    const url = new URL(value);
    if (url.hostname === "api.sigacrm.com.br") {
      const [slug, action, resource] = url.pathname.split("/").filter(Boolean);
      if (slug && action === "cadastrar" && resource === "post-blog") return normalizeSlug(slug);
      if (slug && !["api", "v1", "imovel", "imoveis"].includes(slug)) return normalizeSlug(slug);
    }
  } catch {
    const match = value.match(/api\.sigacrm\.com\.br\/([^/\s]+)(?:\/|$)/i);
    if (match?.[1]) return normalizeSlug(match[1]);
  }

  return "";
}

export async function getSigaBlogIntegration(tenantId: string, profileSlug = ""): Promise<SigaBlogIntegration> {
  const [tenant, settings] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }),
    readTenantSettings(tenantId)
  ]);
  const settingsSlug = normalizeSlug(settings.sigaSlug) || extractSigaImobiliariaSlug(settings.sigaEndpoint);
  const tenantSlug = normalizeSlug(tenant?.slug || "");
  const profileCleanSlug = normalizeSlug(profileSlug);
  const detectedSlug = profileCleanSlug || settingsSlug || (settings.sigaToken ? tenantSlug : "");
  const source = profileCleanSlug ? "blog-profile" : settingsSlug ? "siga-endpoint" : detectedSlug ? "tenant-slug" : "missing";

  return {
    tokenConfigured: Boolean(settings.sigaToken),
    settingsEndpoint: settings.sigaBaseUrl && settingsSlug ? `${settings.sigaBaseUrl.replace(/\/$/, "")}/${settingsSlug}` : settings.sigaEndpoint,
    detectedSlug,
    source,
    publishEndpoint: detectedSlug ? `https://api.sigacrm.com.br/${detectedSlug}/cadastrar/post-blog` : ""
  };
}

async function syncSigaDefaults(tenantId: string, profile: BlogProfile) {
  const integration = await getSigaBlogIntegration(tenantId, profile.sigaImobiliariaSlug);
  if (!profile.sigaImobiliariaSlug && integration.detectedSlug) {
    return prisma.blogProfile.update({
      where: { tenantId },
      data: { sigaImobiliariaSlug: integration.detectedSlug }
    });
  }

  return profile;
}

export function scoreSlug(slug: string, context: { city?: string; region?: string; intent?: string; propertyType?: string }) {
  const clean = normalizeSlug(slug);
  let score = 0;
  const city = normalizeSlug(context.city || "");
  const region = normalizeSlug(context.region || "");
  const propertyType = normalizeSlug(context.propertyType || "");
  const intent = normalizeSlug(context.intent || "");

  if (city && clean.includes(city)) score += 18;
  if (region && clean.includes(region)) score += 14;
  if (propertyType && clean.includes(propertyType)) score += 18;
  if (intent && clean.includes(intent)) score += 14;
  if (containsAny(clean, ["comprar", "vender", "alugar", "investir", "morar", "avaliar", "financiar", "escolher"])) score += 16;
  if (clean.length >= 42 && clean.length <= 85) score += 12;
  if (!/(imobiliaria-.*imobiliaria|imoveis-.*imoveis|gramado-.*gramado)/.test(clean)) score += 8;

  return clampScore(score);
}

export function scoreSeo(post: { title: string; slug: string; description: string; html: string; tags: string }, keyword: string) {
  const title = post.title.toLowerCase();
  const description = post.description.toLowerCase();
  const html = post.html.toLowerCase();
  const keywordText = keyword.toLowerCase();
  let score = 0;

  if (keywordText && title.includes(keywordText)) score += 16;
  if (post.title.length >= 38 && post.title.length <= 70) score += 12;
  if (post.description.length >= 110 && post.description.length <= 160) score += 14;
  if (keywordText && description.includes(keywordText.split(" ")[0])) score += 8;
  if (post.slug.length >= 42 && post.slug.length <= 85) score += 12;
  if (html.includes("<h2")) score += 12;
  if (html.includes("<h3")) score += 8;
  if (html.includes("<ul") || html.includes("<ol")) score += 6;
  if (post.tags.split(",").filter((item) => item.trim()).length >= 3) score += 6;
  if (html.length >= 1800) score += 6;

  return clampScore(score);
}

export function scoreGeo(post: { title: string; slug: string; description: string; html: string }, context: { companyName?: string; city?: string; region?: string }) {
  const text = `${post.title} ${post.slug} ${post.description} ${post.html}`.toLowerCase();
  let score = 0;

  if (context.companyName && text.includes(context.companyName.toLowerCase())) score += 16;
  if (context.city && text.includes(context.city.toLowerCase())) score += 18;
  if (context.region && text.includes(context.region.toLowerCase())) score += 12;
  if (post.html.includes("Perguntas frequentes")) score += 14;
  if (post.html.includes("<h3")) score += 10;
  if (containsAny(text, ["comprar", "vender", "alugar", "investir", "morar", "avaliacao", "financiamento"])) score += 12;
  if (containsAny(text, ["imobiliaria local", "especialista", "documentacao", "seguranca", "valorizacao"])) score += 10;
  if (post.html.includes("schema.org") || post.html.includes("LocalBusiness")) score += 8;

  return clampScore(score);
}

export async function readBlogProfile(tenantId: string) {
  const profile = await prisma.blogProfile.findUnique({ where: { tenantId } });
  if (profile) return syncSigaDefaults(tenantId, profile);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const integration = await getSigaBlogIntegration(tenantId);
  return prisma.blogProfile.create({
    data: {
      tenantId,
      companyName: tenant?.name || "Imobiliaria",
      legalName: tenant?.legalName || "",
      address: [tenant?.addressStreet, tenant?.addressNumber, tenant?.addressDistrict].filter(Boolean).join(", "),
      city: tenant?.addressCity || "",
      state: tenant?.addressState || "",
      phone: tenant?.contactPhone || "",
      whatsapp: tenant?.contactPhone || "",
      email: tenant?.contactEmail || "",
      services: "Venda de imoveis, avaliacao de imoveis, consultoria para investidores",
      propertyTypes: "Apartamentos, casas, terrenos, imoveis de alto padrao",
      regions: tenant?.addressCity || "",
      keywords: "imoveis, imobiliaria, comprar imovel, investir em imoveis",
      sigaImobiliariaSlug: integration.detectedSlug,
      defaultStatus: 1
    }
  });
}

export async function writeBlogProfile(tenantId: string, input: BlogProfileInput) {
  return prisma.blogProfile.upsert({
    where: { tenantId },
    create: {
      tenantId,
      companyName: cleanText(input.companyName) || "Imobiliaria",
      legalName: cleanText(input.legalName),
      creci: cleanText(input.creci),
      address: cleanText(input.address),
      city: cleanText(input.city),
      state: cleanText(input.state).toUpperCase().slice(0, 2),
      phone: cleanText(input.phone),
      whatsapp: cleanText(input.whatsapp),
      email: cleanText(input.email),
      siteUrl: cleanText(input.siteUrl),
      blogUrl: cleanText(input.blogUrl),
      googleBusinessUrl: cleanText(input.googleBusinessUrl),
      instagramUrl: cleanText(input.instagramUrl),
      institutionalText: cleanText(input.institutionalText),
      differentials: cleanText(input.differentials),
      services: cleanText(input.services),
      propertyTypes: cleanText(input.propertyTypes),
      regions: cleanText(input.regions),
      keywords: cleanText(input.keywords),
      forbiddenTopics: cleanText(input.forbiddenTopics),
      tone: cleanText(input.tone) || "consultivo",
      targetAudience: cleanText(input.targetAudience),
      sigaImobiliariaSlug: cleanText(input.sigaImobiliariaSlug),
      sigaIdImob: cleanNumber(input.sigaIdImob),
      sigaIdUsuario: cleanNumber(input.sigaIdUsuario),
      sigaIdCategoria: cleanNumber(input.sigaIdCategoria),
      defaultStatus: Number(input.defaultStatus) === 0 ? 0 : 1,
      mostrarData: Number(input.mostrarData) === 1 ? 1 : 0
    },
    update: {
      companyName: cleanText(input.companyName) || "Imobiliaria",
      legalName: cleanText(input.legalName),
      creci: cleanText(input.creci),
      address: cleanText(input.address),
      city: cleanText(input.city),
      state: cleanText(input.state).toUpperCase().slice(0, 2),
      phone: cleanText(input.phone),
      whatsapp: cleanText(input.whatsapp),
      email: cleanText(input.email),
      siteUrl: cleanText(input.siteUrl),
      blogUrl: cleanText(input.blogUrl),
      googleBusinessUrl: cleanText(input.googleBusinessUrl),
      instagramUrl: cleanText(input.instagramUrl),
      institutionalText: cleanText(input.institutionalText),
      differentials: cleanText(input.differentials),
      services: cleanText(input.services),
      propertyTypes: cleanText(input.propertyTypes),
      regions: cleanText(input.regions),
      keywords: cleanText(input.keywords),
      forbiddenTopics: cleanText(input.forbiddenTopics),
      tone: cleanText(input.tone) || "consultivo",
      targetAudience: cleanText(input.targetAudience),
      sigaImobiliariaSlug: cleanText(input.sigaImobiliariaSlug),
      sigaIdImob: cleanNumber(input.sigaIdImob),
      sigaIdUsuario: cleanNumber(input.sigaIdUsuario),
      sigaIdCategoria: cleanNumber(input.sigaIdCategoria),
      defaultStatus: Number(input.defaultStatus) === 0 ? 0 : 1,
      mostrarData: Number(input.mostrarData) === 1 ? 1 : 0
    }
  });
}

export function buildBlogPost(profile: Awaited<ReturnType<typeof readBlogProfile>>, input: BlogGenerationInput) {
  const city = titleCaseLocation(profile.city || profile.regions, "sua cidade");
  const region = titleCaseLocation(input.region || profile.regions || city, city);
  const propertyType = naturalTerm(input.propertyType || profile.propertyTypes, "imóvel");
  const propertyTypePlural = pluralTerm(propertyType);
  const intent = cleanText(input.intent) || "comprar";
  const topic = cleanText(input.topic) || `${intent} ${propertyType} em ${region}`;
  const keyword = `${intent} ${propertyType} em ${region}`.replace(/\s+/g, " ").trim();
  const title = `${capitalizeIntent(intent)} ${propertyType} em ${region} com segurança`.slice(0, 250);
  const slug = normalizeSlug(`${intent} ${propertyType} em ${region} com seguranca`);
  const tags = unique([
    keyword,
    `imobiliária em ${city}`,
    `${propertyTypePlural} em ${region}`,
    "mercado imobiliário",
    ...splitList(profile.keywords).slice(0, 4)
  ])
    .join(", ")
    .slice(0, 350);
  const description = `Entenda como ${keyword} com segurança, avaliando localização, documentação, valorização e apoio de uma imobiliária local.`.slice(0, 160);
  const safeCompany = escapeHtml(profile.companyName);
  const safeRegion = escapeHtml(region);
  const safeCity = escapeHtml(city);
  const safePropertyType = escapeHtml(propertyType);
  const safePropertyTypePlural = escapeHtml(propertyTypePlural);
  const safeIntent = escapeHtml(intent.toLowerCase());
  const safeAddress = escapeHtml(profile.address);
  const safeWhatsapp = escapeHtml(profile.whatsapp);
  const pStyle = "margin:0 0 18px 0;line-height:1.75;";
  const h2Style = "margin:28px 0 12px 0;line-height:1.35;";
  const h3Style = "margin:20px 0 8px 0;line-height:1.35;";
  const listStyle = "margin:0 0 20px 22px;line-height:1.75;";
  const whatsappHref = whatsappUrl(profile.whatsapp);
  const cta = whatsappHref
    ? `<p style="${pStyle}"><strong>Fale com a ${safeCompany}</strong> pelo <a href="${whatsappHref}" target="_blank" rel="noopener noreferrer"><strong>WhatsApp ${safeWhatsapp}</strong></a> para avaliar opções alinhadas ao seu objetivo.</p>`
    : `<p style="${pStyle}"><strong>Fale com a ${safeCompany}</strong> para avaliar opções alinhadas ao seu objetivo.</p>`;
  const addressBlock = safeAddress
    ? [
        `<h2 style="${h2Style}">Onde encontrar a ${safeCompany}</h2>`,
        `<p style="${pStyle}"><strong>Endereço da imobiliária:</strong> ${safeAddress}</p>`,
        `<p style="${pStyle}">Esse endereço reforça a presença local da ${safeCompany} em ${safeCity}, ajudando compradores e mecanismos de busca a relacionarem a marca à região atendida.</p>`
      ]
    : [];
  const companyIntro = sentenceSummary(
    profile.institutionalText,
    `A ${profile.companyName} atua com foco consultivo para orientar compradores, vendedores e investidores na escolha de imóveis com melhor aderência ao objetivo de cada cliente.`
  );
  const differentiators = bulletItems(profile.differentials, [
    "Conhecimento do mercado local e das regiões com maior demanda.",
    "Apoio na análise de documentação, localização e perfil do imóvel.",
    "Atendimento consultivo para compradores, vendedores e investidores."
  ]);
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: profile.companyName,
    address: profile.address,
    telephone: profile.phone || profile.whatsapp,
    url: profile.siteUrl
  });
  const html = [
    `<p style="${pStyle}"><strong>Comprar ${safePropertyType} em ${safeRegion}</strong> exige mais do que comparar preço. Para tomar uma boa decisão, é importante analisar <strong>localização</strong>, perfil do imóvel, <strong>documentação</strong>, liquidez e <strong>potencial de valorização</strong>.</p>`,
    `<h2 style="${h2Style}">Por que ${safeRegion} merece atenção no mercado imobiliário?</h2>`,
    `<p style="${pStyle}"><strong>${safeRegion}</strong> se destaca para quem busca ${safePropertyTypePlural} com critério, especialmente quando a decisão envolve moradia, investimento patrimonial ou renda futura. A leitura correta do mercado local ajuda a evitar escolhas apressadas.</p>`,
    `<h2 style="${h2Style}">O que avaliar antes de ${safeIntent}?</h2>`,
    `<ul style="${listStyle}"><li><strong>Localização</strong> e acesso aos principais pontos da cidade.</li><li>Perfil do bairro e demanda por imóveis semelhantes.</li><li><strong>Documentação</strong>, matrícula e condições comerciais.</li><li><strong>Potencial de valorização</strong> e liquidez no médio prazo.</li><li>Apoio de uma <strong>imobiliária local</strong> com experiência na região.</li></ul>`,
    `<h2 style="${h2Style}">Como a ${safeCompany} pode ajudar?</h2>`,
    `<p style="${pStyle}">${escapeHtml(companyIntro)}</p>`,
    `<ul style="${listStyle}">${differentiators.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
    `<h2 style="${h2Style}">Perguntas frequentes</h2>`,
    `<h3 style="${h3Style}">Vale a pena ${safeIntent} ${safePropertyType} em ${safeRegion}?</h3>`,
    `<p style="${pStyle}">Sim, desde que a escolha considere localização, documentação, perfil do imóvel e estratégia de uso ou investimento.</p>`,
    `<h3 style="${h3Style}">Por que contar com uma imobiliária local?</h3>`,
    `<p style="${pStyle}">Uma <strong>imobiliária local</strong> conhece bairros, condomínios, histórico de demanda, padrões de preço e pontos que nem sempre aparecem em uma busca superficial.</p>`,
    `<h3 style="${h3Style}">Qual é o primeiro passo?</h3>`,
    `<p style="${pStyle}">O primeiro passo é definir objetivo, faixa de investimento, tipo de imóvel e prazo desejado para encontrar oportunidades compatíveis.</p>`,
    ...addressBlock,
    cta,
    `<script type="application/ld+json">${schema}</script>`
  ]
    .filter(Boolean)
    .join("");

  const post = { title, slug, description, tags, html };
  return {
    ...post,
    topic,
    intent,
    region,
    propertyType,
    seoScore: scoreSeo(post, keyword),
    geoScore: scoreGeo(post, { companyName: profile.companyName, city, region }),
    slugScore: scoreSlug(slug, { city, region, intent, propertyType })
  };
}

function capitalizeIntent(value: string) {
  const clean = cleanText(value).toLowerCase();
  const map: Record<string, string> = {
    comprar: "Como comprar",
    vender: "Como vender",
    alugar: "Como alugar",
    investir: "Como investir em",
    morar: "Como escolher",
    avaliar: "Como avaliar",
    financiar: "Como financiar",
    escolher: "Como escolher"
  };
  return map[clean] || "Como escolher";
}

export function buildSigaPayload(profile: Awaited<ReturnType<typeof readBlogProfile>>, post: Awaited<ReturnType<typeof prisma.blogPost.create>>) {
  return {
    idimob: profile.sigaIdImob,
    idCategoria: profile.sigaIdCategoria,
    idUsuario: profile.sigaIdUsuario,
    titulo: post.title,
    url: post.slug,
    texto: post.html,
    description: post.description,
    tags: post.tags,
    fonte: post.fonte,
    status: profile.defaultStatus,
    data: new Date().toISOString().slice(0, 10),
    mostrarData: profile.mostrarData,
    video: post.video,
    linkExterno: post.linkExterno
  };
}
