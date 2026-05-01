import time
import urllib.request
import urllib.parse
import json

from config import INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID, INSTAGRAM_BASE_URL
from agents.siga_extractor import SigaExtractor
from skills.caption_generator import CaptionGenerator


class ImovelPostAgent:
    """
    Publica imóveis do SIGA CRM direto no Instagram.
    Usa as URLs públicas do CDN do SIGA — não precisa de ImgBB.
    """

    def __init__(self):
        self.siga = SigaExtractor()
        self.caption_gen = CaptionGenerator()

    def publicar_por_codigo(self, codigo: int, caption: str = None) -> dict:
        imovel_raw = self.siga.buscar_imovel_completo(codigo)
        resumo = self.siga.extrair_resumo(imovel_raw)
        return self._publicar(resumo, caption)

    def publicar_destaque(self, caption: str = None) -> dict:
        return self._publicar_com_filtro({"destaque": 1, "ordem": 4}, caption)

    def publicar_lancamento(self, caption: str = None) -> dict:
        return self._publicar_com_filtro({"perfil": "lancamento", "ordem": 4}, caption)

    def publicar_por_filtro(self, filtros: dict, caption: str = None) -> dict:
        return self._publicar_com_filtro(filtros, caption)

    # ── internos ──────────────────────────────────────────────────

    def _publicar_com_filtro(self, filtros: dict, caption: str) -> dict:
        import requests
        from config import SIGA_BASE_URL, SIGA_HEADERS

        resp = requests.get(
            f"{SIGA_BASE_URL}/imoveis",
            headers=SIGA_HEADERS,
            json={**filtros, "limite": 20},
            timeout=30,
        )
        resp.raise_for_status()
        lista = resp.json().get("data", [])

        if not lista:
            raise ValueError(f"Nenhum imóvel encontrado com os filtros: {filtros}")

        import random
        escolhido = random.choice(lista)
        id_interno = escolhido.get("ID")

        time.sleep(1)
        imovel_raw = self.siga.buscar_detalhes(id_interno)
        resumo = self.siga.extrair_resumo(imovel_raw)
        return self._publicar(resumo, caption)

    def _publicar(self, resumo: dict, caption: str = None) -> dict:
        foto_url = self._melhor_foto(resumo)
        if not foto_url:
            raise ValueError(f"Imóvel {resumo.get('codigo')} não tem fotos disponíveis.")

        legenda = caption or self.caption_gen.gerar(resumo)

        container_id = self._criar_container(foto_url, legenda)
        time.sleep(2)
        post_id = self._publicar_container(container_id)

        return {
            "sucesso": True,
            "post_id": post_id,
            "imovel_codigo": resumo.get("codigo"),
            "imovel_nome": resumo.get("nome"),
            "foto_url": foto_url,
            "caption": legenda,
        }

    def _melhor_foto(self, resumo: dict) -> str:
        fotos = resumo.get("fotos", [])
        # Prioriza fotos do imóvel (não do edifício) e retorna a primeira grande
        for foto in fotos:
            if foto.get("tipo") != "edificio" and foto.get("grande"):
                return foto["grande"]
        # Fallback: qualquer foto disponível
        for foto in fotos:
            url = foto.get("grande") or foto.get("media") or foto.get("pequena")
            if url:
                return url
        return ""

    def _criar_container(self, image_url: str, caption: str) -> str:
        data = urllib.parse.urlencode({
            "image_url": image_url,
            "caption": caption,
            "access_token": INSTAGRAM_ACCESS_TOKEN,
        }).encode()

        req = urllib.request.Request(
            f"{INSTAGRAM_BASE_URL}/{INSTAGRAM_ACCOUNT_ID}/media",
            data=data,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())

        if "id" not in resp:
            raise Exception(f"Erro ao criar container: {resp}")
        return resp["id"]

    def _publicar_container(self, container_id: str) -> str:
        data = urllib.parse.urlencode({
            "creation_id": container_id,
            "access_token": INSTAGRAM_ACCESS_TOKEN,
        }).encode()

        req = urllib.request.Request(
            f"{INSTAGRAM_BASE_URL}/{INSTAGRAM_ACCOUNT_ID}/media_publish",
            data=data,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())

        if "id" not in resp:
            raise Exception(f"Erro ao publicar container: {resp}")
        return resp["id"]
