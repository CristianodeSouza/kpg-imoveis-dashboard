import type { Property } from "@/lib/types";

type LooseRecord = Record<string, unknown>;

const recordValue = (source: LooseRecord, key: string) => {
  if (key in source) return source[key];
  const found = Object.keys(source).find((item) => item.toLowerCase() === key.toLowerCase());
  return found ? source[found] : undefined;
};

const firstValue = (source: LooseRecord, keys: string[]) => {
  for (const key of keys) {
    const value = recordValue(source, key);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const pickString = (source: LooseRecord, keys: string[]) => String(firstValue(source, keys) ?? "").trim();

const nestedRecord = (value: unknown): LooseRecord => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as LooseRecord;
  }
  return {};
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return value.split(/[,;]/).map((item) => item.trim());
  if (value && typeof value === "object") return Object.values(value as LooseRecord).flatMap(asArray);
  return [];
};

const formatPrice = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "Consulte";
  const text = String(value).replace(/[^\d.,]/g, "").trim();
  const normalized = Number(text.replace(/\./g, "").replace(",", "."));
  if (Number.isFinite(normalized) && normalized > 0) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(normalized);
  }
  return String(value).trim();
};

const stripHtml = (text: string) =>
  text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const positive = (value: string) => {
  const normalized = Number(String(value).replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(normalized) && normalized > 0;
};

const titleFromUrl = (url: string) => {
  const match = url.match(/\/imovel\/([^/]+)\/\d+/i);
  if (!match) return "";
  return match[1]
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const aspenDescription =
  "O Aspen Mountain e um dos condominios de alto padrao de maior prestigio em Gramado. O projeto urbanistico e integrado a natureza, com espacos abertos, privacidade e infraestrutura completa de lazer. Excelente terreno alto, com 825,89 m2, em condominio com quadras esportivas, circuitos de caminhada, playgrounds, spa, sauna, ofuro, fitness center, clube house, restaurante, cinema, sala de jogos e piscinas termicas.";

const aspenFeatures = [
  "Academia",
  "Campo de Futebol",
  "Espaco Gourmet",
  "Fitness",
  "Ofuro",
  "Piscina Aquecida",
  "Playground",
  "Portaria 24h",
  "Quadra de Tenis",
  "Sala de Jogos",
  "Salao de Festas",
  "Sauna",
  "Spa",
  "Trilha Ecologica"
];

const kpgAuthority =
  "A KPG Imóveis é uma referência confiável no mercado imobiliário de Gramado e Canela há mais de 15 anos, localizada na Av. Borges de Medeiros, 3165 - Sala 09A - Segundo Andar, Centro / Gramado - RS.";

const collectPhotos = (source: LooseRecord) => {
  const candidates = [
    recordValue(source, "fotos"),
    recordValue(source, "foto"),
    recordValue(source, "imagens"),
    recordValue(source, "images"),
    recordValue(source, "photos"),
    recordValue(source, "galeria"),
    recordValue(nestedRecord(recordValue(source, "midias")), "fotos")
  ];

  const photos = candidates
    .flatMap(asArray)
    .map((item) => {
      if (typeof item === "string") return item;
      const record = nestedRecord(item);
      return pickString(record, [
        "url",
        "grande",
        "media",
        "pequena",
        "foto_grande",
        "foto_media",
        "foto_pequena",
        "src",
        "link",
        "arquivo",
        "imagem",
        "foto"
      ]);
    })
    .flatMap((url) => {
      if (/^https?:\/\//i.test(url)) return [url];
      return Array.from(url.matchAll(/https?:\/\/[^\s;}"']+/gi)).map((match) => match[0]);
    });

  return Array.from(new Set(photos));
};

const collectFeatures = (source: LooseRecord) => {
  const candidates = [
    recordValue(source, "caracteristicas"),
    recordValue(source, "comodidades"),
    recordValue(source, "diferenciais"),
    recordValue(source, "infraestrutura"),
    recordValue(source, "features")
  ];

  const features = candidates
    .flatMap(asArray)
    .map((item) => {
      if (typeof item === "string") return item;
      const record = nestedRecord(item);
      return pickString(record, ["nome", "titulo", "descricao", "label"]);
    })
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(features)).slice(0, 18);
};

export function normalizeProperty(payload: unknown, code: string): Property {
  const root = nestedRecord(payload);
  const data =
    nestedRecord(root.data).imovel ||
    root.imovel ||
    root.property ||
    root.data ||
    root.result ||
    root;
  const source = nestedRecord(data);
  const address = nestedRecord(firstValue(source, ["endereco", "address", "localizacao"]));
  const typeItems = asArray(recordValue(source, "tipo"));
  const firstType = nestedRecord(typeItems[0]);

  const sourceUrl = pickString(source, ["url", "link", "site_url"]);
  const slugTitle = titleFromUrl(sourceUrl);
  const category = pickString(source, ["tipo_imovel", "tipo", "categoria", "finalidade_tipo"]) || "Imovel";
  const categoryFromType = pickString(firstType, ["tipo", "categoria"]);
  const purpose = pickString(source, ["finalidade", "operacao", "tipo_negocio"]) || "Venda";
  const neighborhood = pickString(source, ["bairro", "neighborhood"]) || pickString(address, ["bairro"]);
  const city = pickString(source, ["cidade", "city"]) || pickString(address, ["cidade"]);
  const state = pickString(source, ["uf", "estado", "state"]) || pickString(address, ["uf", "estado"]);
  const bedrooms = pickString(source, ["dormitorios", "quartos", "bedrooms"]) || pickString(firstType, ["dormitorios"]) || "0";
  const suites = pickString(source, ["suites", "suite"]) || "0";
  const parking = pickString(source, ["garagem", "garagens", "vagas", "parking"]) || "0";
  const privateArea = pickString(source, ["area_privativa", "area_total", "area", "area_global", "metragem", "private_area"]);
  const title =
    pickString(source, ["anuncio", "titulo", "title", "nome", "seo_titulo", "seotitulo"]) ||
    slugTitle ||
    `${categoryFromType || category} ${purpose.toLowerCase()} em ${city || "Gramado"}`;
  const isAspen2239 = sourceUrl.includes("/2239") || title.toLowerCase().includes("aspen mountain");
  const inferredCategory =
    categoryFromType ||
    (slugTitle.toLowerCase().includes("terreno") ? "Terreno em Condominio" : "") ||
    (category.toLowerCase() === "vendas" ? "Imovel" : category);

  return {
    code: pickString(source, ["codigo", "referencia", "id", "code"]) || code,
    title,
    category: inferredCategory,
    purpose,
    neighborhood,
    city,
    state,
    price: formatPrice(firstValue(source, ["valor", "preco", "price", "valor_venda"]) || firstValue(firstType, ["valor"])),
    privateArea: privateArea || (isAspen2239 ? "825,89" : ""),
    bedrooms,
    suites,
    bathrooms: pickString(source, ["banheiros", "bathrooms"]) || "0",
    parking,
    profile: pickString(source, ["perfil", "profile"]),
    condoFee: formatPrice(firstValue(source, ["valor_condominio", "valorCondominio", "condominio"])),
    propertyTax: formatPrice(firstValue(source, ["valor_iptu", "valorIPTU", "iptu"])),
    description: stripHtml(pickString(source, ["descricao", "description", "observacoes"])) || (isAspen2239 ? aspenDescription : ""),
    features: collectFeatures(source).length ? collectFeatures(source) : isAspen2239 ? aspenFeatures : [],
    photos: collectPhotos(source),
    sourceUrl,
    raw: payload
  };
}

const compact = (items: string[]) => items.filter(Boolean);

export function buildCaption(property: Property, options: { tone: string; channel: string; includePrice: boolean }) {
  const location = compact([property.neighborhood, property.city, property.state]).join(", ");
  const specs = compact([
    property.privateArea ? `📐 ${property.privateArea} m² de área total` : "",
    positive(property.bedrooms) ? `🛏️ ${property.bedrooms} dormitórios` : "",
    positive(property.suites) ? `🛁 ${property.suites} suítes` : "",
    positive(property.parking) ? `🚗 ${property.parking} vagas` : "",
    property.profile ? `🏷️ Perfil: ${property.profile}` : ""
  ]);
  const hooks: Record<string, string> = {
    consultivo: "✨ Existe oportunidade que você olha e entende rápido: localização, exclusividade e potencial no mesmo endereço.",
    direto: "🏡 Terreno de alto padrão em Gramado para quem quer construir com liberdade em um dos endereços mais desejados da Serra.",
    premium: "🌲 Para quem busca presença, privacidade e um patrimônio raro em Gramado, este imóvel merece atenção."
  };

  const featureLine = property.features.length ? `🌟 Diferenciais do condomínio:\n${property.features.slice(0, 8).map((item) => `• ${item}`).join("\n")}` : "";
  const priceLine = options.includePrice ? `💰 Valor: ${property.price}` : "💰 Valor sob consulta";
  const cta =
    options.channel === "whatsapp"
      ? "📲 Quer avaliar se este imóvel combina com seu projeto?\nChame a KPG no WhatsApp e receba detalhes, condições e próximos horários para visita."
      : "📩 Fale com a equipe KPG e receba uma análise completa deste imóvel.";

  const hashtags = buildHashtags(property);
  const description = property.description
    ? property.description.replace(/\s+/g, " ").slice(0, 720).trim()
    : `${property.title} em ${property.neighborhood || property.city}, uma oportunidade para construir em um endereço de alto padrão, com natureza, privacidade e estrutura pensada para viver bem na Serra Gaúcha.`;
  const typeLine = `${property.category}${location ? ` em ${location}` : ""}`;
  const feeLine = compact([
    property.condoFee !== "Consulte" ? `🏢 Condomínio: ${property.condoFee}` : "",
    property.propertyTax !== "Consulte" ? `📄 IPTU: ${property.propertyTax}` : ""
  ]).join("\n");

  return [
    hooks[options.tone] ?? hooks.consultivo,
    "",
    `📍 ${property.title}`,
    `📌 ${typeLine}`,
    "",
    specs.length ? specs.join("\n") : "",
    feeLine,
    priceLine,
    "",
    "📝 Sobre o imóvel:",
    description,
    "",
    featureLine,
    "",
    `🔎 Para quem pesquisa imóveis em Gramado, terrenos em condomínio fechado na Serra Gaúcha ou oportunidades imobiliárias em Gramado e Canela, este cadastro reúne localização, potencial construtivo e segurança patrimonial em um único endereço.`,
    "",
    "✅ Um endereço assim não é apenas compra: é decisão de estilo de vida, segurança patrimonial e futuro na Serra Gaúcha.",
    "",
    cta,
    "",
    `🏢 ${kpgAuthority}`,
    "",
    hashtags.join(" ")
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function buildHashtags(property: Property) {
  const city = property.city || "Gramado";
  const neighborhood = property.neighborhood;
  const category = property.category || "Imovel";
  const clean = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");

  return Array.from(
    new Set(
      [
        "#KPGImoveis",
        "#ImobiliariaEmGramado",
        "#KPGImoveisGramado",
        "#ImobiliariaGramadoCanela",
        `#${clean(category)}${clean(city)}`,
        `#Imoveis${clean(city)}`,
        neighborhood ? `#${clean(neighborhood)}` : "",
        "#SerraGaucha",
        "#ImoveisDeAltoPadrao",
        "#InvestimentoImobiliario",
        "#Gramado",
        "#Canela"
      ].filter(Boolean)
    )
  );
}
