import os
import time
import base64
import requests
from config import (
    INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID,
    INSTAGRAM_BASE_URL, IMGBB_API_KEY
)


class InstagramPublisher:

    def publicar_tudo(self, criativos: dict, caption: str, video_url: str = None) -> dict:
        resultado = {}

        # Feed / Carrossel
        if criativos.get("carousel"):
            try:
                post_id = self.publicar_carrossel(criativos["carousel"], caption)
                resultado["feed"] = {"sucesso": True, "id": post_id}
            except Exception as e:
                resultado["feed"] = {"sucesso": False, "erro": str(e)}

        # Stories
        if criativos.get("stories"):
            try:
                stories_id = self.publicar_stories(criativos["stories"][0])
                resultado["stories"] = {"sucesso": True, "id": stories_id}
            except Exception as e:
                resultado["stories"] = {"sucesso": False, "erro": str(e)}

        # Reels (apenas se tiver vídeo)
        if video_url:
            try:
                reels_id = self.publicar_reels(video_url, caption)
                resultado["reels"] = {"sucesso": True, "id": reels_id}
            except Exception as e:
                resultado["reels"] = {"sucesso": False, "erro": str(e)}

        return resultado

    def publicar_carrossel(self, caminhos_imagens: list[str], caption: str) -> str:
        if len(caminhos_imagens) == 1:
            return self._publicar_imagem_unica(caminhos_imagens[0], caption)

        urls = [self._hospedar_imagem(p) for p in caminhos_imagens[:10]]

        containers = []
        for url in urls:
            r = requests.post(
                f"{INSTAGRAM_BASE_URL}/{INSTAGRAM_ACCOUNT_ID}/media",
                params={
                    "image_url": url,
                    "is_carousel_item": "true",
                    "access_token": INSTAGRAM_ACCESS_TOKEN,
                }
            )
            self._checar_erro(r)
            containers.append(r.json()["id"])
            time.sleep(1)

        r = requests.post(
            f"{INSTAGRAM_BASE_URL}/{INSTAGRAM_ACCOUNT_ID}/media",
            params={
                "media_type": "CAROUSEL",
                "children": ",".join(containers),
                "caption": caption,
                "access_token": INSTAGRAM_ACCESS_TOKEN,
            }
        )
        self._checar_erro(r)
        carousel_id = r.json()["id"]

        return self._publicar_container(carousel_id)

    def publicar_stories(self, caminho_imagem: str) -> str:
        url = self._hospedar_imagem(caminho_imagem)

        r = requests.post(
            f"{INSTAGRAM_BASE_URL}/{INSTAGRAM_ACCOUNT_ID}/media",
            params={
                "image_url": url,
                "media_type": "STORIES",
                "access_token": INSTAGRAM_ACCESS_TOKEN,
            }
        )
        self._checar_erro(r)
        container_id = r.json()["id"]

        return self._publicar_container(container_id)

    def publicar_reels(self, video_url: str, caption: str) -> str:
        r = requests.post(
            f"{INSTAGRAM_BASE_URL}/{INSTAGRAM_ACCOUNT_ID}/media",
            params={
                "video_url": video_url,
                "media_type": "REELS",
                "caption": caption,
                "access_token": INSTAGRAM_ACCESS_TOKEN,
            }
        )
        self._checar_erro(r)
        container_id = r.json()["id"]

        # Aguarda processamento do vídeo
        for _ in range(24):
            time.sleep(5)
            r = requests.get(
                f"{INSTAGRAM_BASE_URL}/{container_id}",
                params={"fields": "status_code", "access_token": INSTAGRAM_ACCESS_TOKEN}
            )
            status = r.json().get("status_code")
            if status == "FINISHED":
                break
            elif status == "ERROR":
                raise Exception("Erro no processamento do vídeo no Instagram.")

        return self._publicar_container(container_id)

    def _publicar_imagem_unica(self, caminho: str, caption: str) -> str:
        url = self._hospedar_imagem(caminho)
        r = requests.post(
            f"{INSTAGRAM_BASE_URL}/{INSTAGRAM_ACCOUNT_ID}/media",
            params={
                "image_url": url,
                "caption": caption,
                "access_token": INSTAGRAM_ACCESS_TOKEN,
            }
        )
        self._checar_erro(r)
        container_id = r.json()["id"]
        return self._publicar_container(container_id)

    def _publicar_container(self, container_id: str) -> str:
        r = requests.post(
            f"{INSTAGRAM_BASE_URL}/{INSTAGRAM_ACCOUNT_ID}/media_publish",
            params={
                "creation_id": container_id,
                "access_token": INSTAGRAM_ACCESS_TOKEN,
            }
        )
        self._checar_erro(r)
        return r.json()["id"]

    def _hospedar_imagem(self, caminho: str) -> str:
        if not IMGBB_API_KEY:
            raise ValueError("IMGBB_API_KEY não configurada no .env")

        with open(caminho, "rb") as f:
            imagem_b64 = base64.b64encode(f.read()).decode("utf-8")

        r = requests.post(
            "https://api.imgbb.com/1/upload",
            data={"key": IMGBB_API_KEY, "image": imagem_b64},
            timeout=30
        )
        r.raise_for_status()
        return r.json()["data"]["url"]

    def _checar_erro(self, response: requests.Response):
        if not response.ok:
            try:
                erro = response.json().get("error", {}).get("message", response.text)
            except Exception:
                erro = response.text
            raise Exception(f"Instagram API erro {response.status_code}: {erro}")
