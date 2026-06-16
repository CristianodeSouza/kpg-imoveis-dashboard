import { NextResponse } from "next/server";
import { postToBackend } from "@/lib/backend";
import { normalizeProperty } from "@/lib/property";

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  const body = await request.json();
  const codigo = String(body.codigo || body.code || "").trim();

  if (!codigo) {
    return NextResponse.json({ sucesso: false, error: "Informe o codigo do imovel." }, { status: 400 });
  }

  const backend = await postToBackend<{ sucesso: boolean; imovel: unknown }>("/api/buscar", {
    codigo: Number(codigo)
  });

  if (backend?.imovel) {
    return NextResponse.json({
      sucesso: true,
      imovel: backend.imovel,
      property: normalizeProperty({ imovel: backend.imovel }, codigo),
      origem: "backend"
    });
  }

  const endpoint = `https://www.kpgimoveis.com.br/api/imovel/${encodeURIComponent(codigo)}`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Referer: "https://www.kpgimoveis.com.br/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    },
    cache: "no-store"
  });
  const text = await response.text();

  if (!response.ok || !text.trim()) {
    const fallback = fallbackProperty(codigo);
    if (fallback) {
      return NextResponse.json({
        sucesso: true,
        imovel: fallback,
        property: normalizeProperty({ data: fallback }, codigo),
        origem: "fallback-kpg"
      });
    }

    return NextResponse.json({ sucesso: false, error: "Nenhum imovel encontrado para este codigo." }, { status: 404 });
  }

  try {
    const payload = JSON.parse(text);
    return NextResponse.json({
      sucesso: true,
      imovel: payload?.imovel || payload?.data || payload,
      property: normalizeProperty(payload, codigo),
      origem: "proxy-kpg"
    });
  } catch {
    const fallback = fallbackProperty(codigo);
    if (fallback) {
      return NextResponse.json({
        sucesso: true,
        imovel: fallback,
        property: normalizeProperty({ data: fallback }, codigo),
        origem: "fallback-kpg"
      });
    }

    return NextResponse.json({ sucesso: false, error: "A API retornou conteudo invalido." }, { status: 502 });
  }
}
