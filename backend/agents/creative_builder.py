import os
import io
import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from config import (
    KPG_PRIMARY, KPG_ACCENT, KPG_WHITE, KPG_OVERLAY,
    FONT_BOLD, FONT_REGULAR, CRIATIVOS_DIR
)


class CreativeBuilder:

    FEED_SIZE = (1080, 1350)
    STORIES_SIZE = (1080, 1920)
    CAROUSEL_SIZE = (1080, 1080)

    def gerar_todos(self, imovel: dict, fotos: list[dict]) -> dict:
        codigo = imovel.get("codigo", "imovel")
        pasta = os.path.join(CRIATIVOS_DIR, str(codigo))
        os.makedirs(pasta, exist_ok=True)

        resultado = {"feed": [], "stories": [], "carousel": []}

        fotos_imovel = [f for f in fotos if f["tipo"] != "edificio" and f["url"]][:10]
        if not fotos_imovel:
            fotos_imovel = fotos[:10]

        # Feed principal (primeira foto)
        if fotos_imovel:
            img = self._criar_feed(imovel, fotos_imovel[0]["url"])
            caminho = os.path.join(pasta, "feed_principal.jpg")
            img.save(caminho, "JPEG", quality=95)
            resultado["feed"].append(caminho)

        # Carrossel (até 10 fotos)
        for i, foto in enumerate(fotos_imovel[:10]):
            img = self._criar_carousel(imovel, foto["url"], i == 0)
            caminho = os.path.join(pasta, f"carousel_{i+1:02d}.jpg")
            img.save(caminho, "JPEG", quality=95)
            resultado["carousel"].append(caminho)

        # Stories (primeira foto)
        if fotos_imovel:
            img = self._criar_stories(imovel, fotos_imovel[0]["url"])
            caminho = os.path.join(pasta, "stories.jpg")
            img.save(caminho, "JPEG", quality=95)
            resultado["stories"].append(caminho)

        return resultado

    def _criar_feed(self, imovel: dict, foto_url: str) -> Image.Image:
        return self._compor_imagem(imovel, foto_url, self.FEED_SIZE)

    def _criar_carousel(self, imovel: dict, foto_url: str, primeira: bool) -> Image.Image:
        img = self._compor_imagem(imovel, foto_url, self.CAROUSEL_SIZE)
        if not primeira:
            img = self._compor_imagem_simples(imovel, foto_url, self.CAROUSEL_SIZE)
        return img

    def _criar_stories(self, imovel: dict, foto_url: str) -> Image.Image:
        return self._compor_imagem(imovel, foto_url, self.STORIES_SIZE)

    def _compor_imagem(self, imovel: dict, foto_url: str, tamanho: tuple) -> Image.Image:
        bg = self._baixar_e_redimensionar(foto_url, tamanho)
        overlay = self._criar_overlay(tamanho)
        bg.paste(overlay, (0, 0), overlay)
        self._desenhar_textos(bg, imovel, tamanho)
        self._desenhar_logo(bg, tamanho)
        return bg

    def _compor_imagem_simples(self, imovel: dict, foto_url: str, tamanho: tuple) -> Image.Image:
        bg = self._baixar_e_redimensionar(foto_url, tamanho)
        overlay = self._criar_overlay_simples(tamanho)
        bg.paste(overlay, (0, 0), overlay)
        self._desenhar_logo(bg, tamanho)
        return bg

    def _baixar_e_redimensionar(self, url: str, tamanho: tuple) -> Image.Image:
        try:
            resp = requests.get(url, timeout=20)
            resp.raise_for_status()
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            img = self._crop_center(img, tamanho)
            return img
        except Exception:
            img = Image.new("RGB", tamanho, KPG_PRIMARY)
            return img

    def _crop_center(self, img: Image.Image, tamanho: tuple) -> Image.Image:
        w, h = img.size
        tw, th = tamanho
        ratio_w = tw / w
        ratio_h = th / h
        ratio = max(ratio_w, ratio_h)
        nw, nh = int(w * ratio), int(h * ratio)
        img = img.resize((nw, nh), Image.LANCZOS)
        left = (nw - tw) // 2
        top = (nh - th) // 2
        return img.crop((left, top, left + tw, top + th))

    def _criar_overlay(self, tamanho: tuple) -> Image.Image:
        w, h = tamanho
        overlay = Image.new("RGBA", tamanho, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Gradiente do fundo: transparente → escuro nos 55% inferiores
        altura_grad = int(h * 0.55)
        y_start = h - altura_grad
        for i in range(altura_grad):
            alpha = int(210 * (i / altura_grad) ** 0.7)
            r, g, b = KPG_OVERLAY[:3]
            draw.line([(0, y_start + i), (w, y_start + i)], fill=(r, g, b, alpha))

        return overlay

    def _criar_overlay_simples(self, tamanho: tuple) -> Image.Image:
        w, h = tamanho
        overlay = Image.new("RGBA", tamanho, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        altura_grad = int(h * 0.20)
        y_start = h - altura_grad
        for i in range(altura_grad):
            alpha = int(160 * (i / altura_grad))
            draw.line([(0, y_start + i), (w, y_start + i)], fill=(15, 25, 45, alpha))
        return overlay

    def _desenhar_textos(self, img: Image.Image, imovel: dict, tamanho: tuple):
        w, h = tamanho
        draw = ImageDraw.Draw(img)

        font_titulo = self._fonte(52)
        font_preco = self._fonte(68, bold=True)
        font_info = self._fonte(38)
        font_local = self._fonte(34)

        margin = 52
        y = h - 80

        # Localização
        local = self._texto_local(imovel)
        draw.text((margin, y - font_local.size), local, font=font_local, fill=(200, 210, 230))
        y -= font_local.size + 18

        # Características
        info = self._texto_caracteristicas(imovel)
        draw.text((margin, y - font_info.size), info, font=font_info, fill=tuple(KPG_WHITE))
        y -= font_info.size + 22

        # Preço
        preco = self._formatar_preco(imovel)
        draw.text((margin, y - font_preco.size), preco, font=font_preco, fill=tuple(KPG_ACCENT))
        y -= font_preco.size + 16

        # Nome do imóvel
        nome = imovel.get("nome") or imovel.get("categoria", "Imóvel à Venda")
        nome = self._truncar(nome, 38)
        draw.text((margin, y - font_titulo.size), nome, font=font_titulo, fill=tuple(KPG_WHITE))

    def _desenhar_logo(self, img: Image.Image, tamanho: tuple):
        w, h = tamanho
        draw = ImageDraw.Draw(img)

        font_logo = self._fonte(36, bold=True)
        font_sub = self._fonte(22)

        margin = 48
        padding = 16

        # Fundo da logo
        bw, bh = 260, 76
        draw.rectangle([margin - padding, 36, margin + bw, 36 + bh],
                        fill=(15, 25, 45, 200))

        draw.text((margin, 46), "KPG IMÓVEIS", font=font_logo, fill=tuple(KPG_ACCENT))
        draw.text((margin, 46 + 38), "Realizando sonhos", font=font_sub, fill=(180, 190, 210))

    def _formatar_preco(self, imovel: dict) -> str:
        valor = imovel.get("valor")
        if not valor:
            return "Consulte o valor"
        try:
            v = float(str(valor).replace(".", "").replace(",", "."))
            return f"R$ {v:_.2f}".replace("_", ".")
        except Exception:
            return f"R$ {valor}"

    def _texto_caracteristicas(self, imovel: dict) -> str:
        partes = []
        dorms = imovel.get("dormitorios")
        if dorms:
            partes.append(f"{dorms} dorm{'s' if int(dorms) > 1 else ''}")
        suites = imovel.get("suites")
        if suites and int(suites) > 0:
            partes.append(f"{suites} suíte{'s' if int(suites) > 1 else ''}")
        area = imovel.get("area_privativa") or imovel.get("area_global")
        if area:
            partes.append(f"{area} m²")
        garagem = imovel.get("garagem")
        if garagem and int(garagem) > 0:
            partes.append(f"{garagem} vaga{'s' if int(garagem) > 1 else ''}")
        return "  •  ".join(partes) if partes else ""

    def _texto_local(self, imovel: dict) -> str:
        partes = []
        bairro = imovel.get("bairro")
        cidade = imovel.get("cidade")
        uf = imovel.get("uf")
        if bairro:
            partes.append(bairro)
        if cidade:
            partes.append(cidade)
        if uf:
            partes.append(uf.upper())
        return ", ".join(partes)

    def _truncar(self, texto: str, max_chars: int) -> str:
        return texto[:max_chars] + "..." if len(texto) > max_chars else texto

    def _fonte(self, size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
        caminho = FONT_BOLD if bold else FONT_REGULAR
        try:
            return ImageFont.truetype(caminho, size)
        except Exception:
            return ImageFont.load_default()
