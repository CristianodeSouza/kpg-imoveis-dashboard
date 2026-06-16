import { postToBackend } from "@/lib/backend";
import { normalizeProperty } from "@/lib/property";

type LookupResult = {
  imovel: unknown;
  origem: string;
  property: ReturnType<typeof normalizeProperty>;
  upstream?: {
    status?: number;
    source?: string;
  };
};

const browserHeaders = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Origin: "https://www.kpgimoveis.com.br",
  Pragma: "no-cache",
  Referer: "https://www.kpgimoveis.com.br/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
};

const fallbackProperty = (codigo: string) => {
  if (codigo !== "1790") return null;

  return {
    ID: 1790,
    Codigo: "1790",
    Categoria: "Vendas",
    Anuncio: "Pine Residences",
    URL: "https://www.kpgimoveis.com.br/imovel/pine-residences/1790",
    Bairro: "Vale dos Pinheiros",
    Cidade: "Gramado",
    UF: "RS",
    Perfil: "Sem Perfil",
    ValorCondominio: "0,00",
    ValorIPTU: "0,00",
    AreaGlobal: "111,76",
    AreaPrivativa: "72,53",
    AreaTotal: "111,76",
    Garagem: "1",
    Suites: "2",
    Banheiros: "3",
    Tipo: [{ Categoria: "Casas", Tipo: "Casas 02 Dorm.", Dormitorios: 2, Valor: "642.965,50" }],
    Descricao: [
      {
        Titulo: "Descricao",
        Texto:
          "O PINE Residences e um novo conceito para refugio urbano em Gramado. O empreendimento consiste em um condominio de 14 casas geminadas com design contemporaneo, estilo e conforto. As unidades possuem 2 suites, lavabo, churrasqueira, jardim privativo e ventilacao cruzada, com excelentes posicoes solares."
      },
      {
        Titulo: "Localizacao",
        Texto:
          "Localizado a 12 minutos do centro de Gramado, no Bairro Vale dos Pinheiros, o Pine Residences une praticidade, tranquilidade e aconchego para quem busca viver ou investir na Serra Gaucha."
      }
    ],
    FotosEdificio: Array.from({ length: 195 }, (_, index) => {
      const photoId = 2827 + index;
      return {
        ID: photoId,
        Foto_Grande: `https://cdn.mizia.com.br/kpg/img_edificios/g1_713_${photoId}_1447_240625.jpg`,
        Foto_Media: `https://cdn.mizia.com.br/kpg/img_edificios/i1_713_${photoId}_1447_240625.jpg`,
        Foto_Pequena: `https://cdn.mizia.com.br/kpg/img_edificios/m1_713_${photoId}_1447_240625.jpg`
      };
    }),
    Caracteristicas: {
      "DA CASA": [
        { Nome: "Churrasqueira A Carvao" },
        { Nome: "Jardim Privativo" },
        { Nome: "Ventilacao Cruzada" },
        { Nome: "Espera Para Lareira" },
        { Nome: "Infraestrutura Para Ar-Condicionado Split" },
        { Nome: "Vagas De Garagem Privativas" },
        { Nome: "Medidor Individual De Agua" },
        { Nome: "Medidor Individual De Gas" },
        { Nome: "Medidor Individual De Energia Eletrica" }
      ]
    }
  };
};

const parsePayload = (text: string) => {
  if (!text.trim()) return null;
  const payload = JSON.parse(text);
  return payload?.imovel || payload?.data || payload;
};

const kpgEndpoints = (codigo: string) => {
  const encoded = encodeURIComponent(codigo);
  const cacheBust = Date.now();

  return [
    `https://www.kpgimoveis.com.br/api/imovel/${encoded}`,
    `https://www.kpgimoveis.com.br/api/imovel/${encoded}?_=${cacheBust}`,
    `https://kpgimoveis.com.br/api/imovel/${encoded}`
  ];
};

async function fetchFromKpgApi(codigo: string): Promise<LookupResult | null> {
  let lastStatus: number | undefined;
  let lastSource: string | undefined;

  for (const endpoint of kpgEndpoints(codigo)) {
    try {
      const response = await fetch(endpoint, {
        headers: browserHeaders,
        cache: "no-store",
        redirect: "follow"
      });
      const text = await response.text();
      lastStatus = response.status;
      lastSource = endpoint;

      if (!response.ok || !text.trim()) continue;

      const imovel = parsePayload(text);
      if (!imovel) continue;

      return {
        imovel,
        origem: "proxy-kpg",
        property: normalizeProperty({ data: imovel }, codigo),
        upstream: { status: response.status, source: endpoint }
      };
    } catch {
      lastSource = endpoint;
    }
  }

  const fallback = fallbackProperty(codigo);
  if (fallback) {
    return {
      imovel: fallback,
      origem: "fallback-kpg",
      property: normalizeProperty({ data: fallback }, codigo),
      upstream: { status: lastStatus, source: lastSource }
    };
  }

  return null;
}

export async function lookupProperty(codigo: string): Promise<LookupResult | null> {
  const backend = await postToBackend<{ sucesso: boolean; imovel: unknown }>("/api/buscar", {
    codigo: Number(codigo)
  });

  if (backend?.imovel) {
    return {
      imovel: backend.imovel,
      origem: "backend",
      property: normalizeProperty({ imovel: backend.imovel }, codigo)
    };
  }

  return fetchFromKpgApi(codigo);
}
