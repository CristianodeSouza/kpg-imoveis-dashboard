import os
from config import ANTHROPIC_API_KEY


class CaptionGenerator:

    def gerar(self, imovel: dict) -> str:
        if ANTHROPIC_API_KEY:
            return self._gerar_com_ia(imovel)
        return self._gerar_template(imovel)

    def _gerar_com_ia(self, imovel: dict) -> str:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

            prompt = self._montar_prompt(imovel)

            msg = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}]
            )
            return msg.content[0].text.strip()
        except Exception as e:
            print(f"Erro na geração de legenda com IA: {e}")
            return self._gerar_template(imovel)

    def _montar_prompt(self, imovel: dict) -> str:
        nome = imovel.get("nome", "")
        preco = imovel.get("valor", "")
        bairro = imovel.get("bairro", "")
        cidade = imovel.get("cidade", "")
        uf = imovel.get("uf", "")
        dorms = imovel.get("dormitorios", "")
        suites = imovel.get("suites", "")
        area = imovel.get("area_privativa") or imovel.get("area_global", "")
        garagem = imovel.get("garagem", "")
        categoria = imovel.get("categoria", "")
        descricao = imovel.get("descricao", "")[:300]

        return f"""Crie uma legenda para Instagram de uma imobiliária premium brasileira (KPG Imóveis).
A legenda deve ser envolvente, elegante e profissional. Use emojis estrategicamente.
Inclua os dados do imóvel de forma natural. Termine com hashtags relevantes (máximo 20).

DADOS DO IMÓVEL:
- Nome/Tipo: {nome}
- Categoria: {categoria}
- Localização: {bairro}, {cidade} - {uf}
- Valor: R$ {preco}
- Dormitórios: {dorms} | Suítes: {suites} | Área: {area} m² | Vagas: {garagem}
- Descrição: {descricao}

Responda APENAS com a legenda pronta para copiar e publicar no Instagram. Sem explicações."""

    def _gerar_template(self, imovel: dict) -> str:
        nome = imovel.get("nome") or imovel.get("categoria", "Imóvel Exclusivo")
        bairro = imovel.get("bairro", "")
        cidade = imovel.get("cidade", "")
        uf = (imovel.get("uf") or "").upper()
        dorms = imovel.get("dormitorios", "")
        area = imovel.get("area_privativa") or imovel.get("area_global", "")
        garagem = imovel.get("garagem", "")
        preco = imovel.get("valor", "")
        codigo = imovel.get("codigo", "")

        local = f"{bairro}, {cidade} - {uf}".strip(", ")

        linhas = [
            f"✨ {nome}",
            "",
            f"📍 {local}" if local.strip(", ") else "",
            "",
        ]

        caracteristicas = []
        if dorms:
            caracteristicas.append(f"🛏 {dorms} dormitório{'s' if int(dorms) > 1 else ''}")
        if area:
            caracteristicas.append(f"📐 {area} m²")
        if garagem:
            caracteristicas.append(f"🚗 {garagem} vaga{'s' if int(garagem) > 1 else ''}")

        if caracteristicas:
            linhas.extend(caracteristicas)
            linhas.append("")

        if preco:
            try:
                v = float(str(preco).replace(".", "").replace(",", "."))
                preco_fmt = f"R$ {v:_.2f}".replace("_", ".")
            except Exception:
                preco_fmt = f"R$ {preco}"
            linhas.append(f"💰 {preco_fmt}")
            linhas.append("")

        linhas.extend([
            "Entre em contato e agende sua visita! 📲",
            "",
            "#KPGImoveis #ImoveisLuxo #ImoveisExclusivos",
            f"#{cidade.replace(' ', '')}Imoveis #{bairro.replace(' ', '')}",
            "#ImoveisParaVenda #ImoveisAluguel #CorretorDeImoveis",
        ])

        return "\n".join(l for l in linhas if l is not None)
