import requests
import time
from config import SIGA_BASE_URL, SIGA_HEADERS


class SigaExtractor:

    def buscar_por_codigo(self, codigo: int) -> dict:
        url = f"{SIGA_BASE_URL}/imoveis"
        body = {"codigoImovel": codigo}

        resp = self._get(url, json=body)
        data = resp.get("data", [])

        if not data:
            raise ValueError(f"Nenhum imóvel encontrado com o código {codigo}.")

        return data[0]

    def buscar_detalhes(self, id_imovel: int) -> dict:
        url = f"{SIGA_BASE_URL}/imovel/{id_imovel}"
        return self._get(url).get("data", {})

    def buscar_imovel_completo(self, codigo: int) -> dict:
        resumo = self.buscar_por_codigo(codigo)
        id_interno = resumo.get("ID")
        time.sleep(1)
        return self.buscar_detalhes(id_interno)

    def extrair_fotos(self, imovel: dict) -> list[dict]:
        fotos = []

        raw = imovel.get("Fotos", {})
        if isinstance(raw, list):
            for f in raw:
                fotos.append(self._normalizar_foto(f, "imovel"))
        elif isinstance(raw, dict):
            for pasta, itens in raw.items():
                for f in itens:
                    fotos.append(self._normalizar_foto(f, pasta))

        for f in imovel.get("FotosEdificio", []):
            fotos.append(self._normalizar_foto(f, "edificio"))

        return fotos

    def extrair_resumo(self, imovel: dict) -> dict:
        tipos = imovel.get("Tipo", [])
        valor = None
        dormitorios = None
        if tipos:
            valor = tipos[0].get("Valor")
            dormitorios = tipos[0].get("Dormitorios")

        return {
            "id": imovel.get("ID"),
            "codigo": imovel.get("Codigo"),
            "nome": imovel.get("Nome"),
            "categoria": imovel.get("Categoria"),
            "situacao": imovel.get("Situacao"),
            "perfil": imovel.get("Perfil"),
            "valor": valor or imovel.get("Valor"),
            "valor_condominio": imovel.get("ValorCondominio"),
            "valor_iptu": imovel.get("ValorIPTU"),
            "endereco": imovel.get("Endereco"),
            "bairro": imovel.get("Bairro"),
            "cidade": imovel.get("Cidade"),
            "uf": imovel.get("UF"),
            "area_privativa": imovel.get("AreaPrivativa"),
            "area_global": imovel.get("AreaGlobal"),
            "dormitorios": dormitorios or imovel.get("Dormitorios"),
            "suites": imovel.get("Suites"),
            "banheiros": imovel.get("Banheiros"),
            "garagem": imovel.get("Garagem"),
            "mobilia": imovel.get("Mobilia"),
            "aceita_pet": imovel.get("AceitaPet"),
            "video": imovel.get("Video"),
            "tour_virtual": imovel.get("TourVirtual"),
            "url": imovel.get("URL"),
            "corretor": imovel.get("Agenciador", {}),
            "descricao": self._extrair_descricao(imovel),
            "fotos": self.extrair_fotos(imovel),
        }

    def _extrair_descricao(self, imovel: dict) -> str:
        descricoes = imovel.get("Descricao", [])
        if isinstance(descricoes, list) and descricoes:
            texto = descricoes[0].get("Descricao", "")
            import re
            return re.sub(r"<[^>]+>", "", texto).strip()
        return ""

    def _normalizar_foto(self, foto: dict, tipo: str) -> dict:
        return {
            "tipo": tipo,
            "titulo": foto.get("Titulo", ""),
            "grande": foto.get("Foto_Grande", ""),
            "media": foto.get("Foto_Media", ""),
            "pequena": foto.get("Foto_Pequena", ""),
            "url": foto.get("Foto_Grande") or foto.get("Foto_Media") or foto.get("Foto_Pequena", ""),
        }

    def _get(self, url: str, json: dict = None) -> dict:
        resp = requests.get(url, headers=SIGA_HEADERS, json=json, timeout=30)

        if resp.status_code == 429:
            print("Rate limit atingido. Aguardando 60s...")
            time.sleep(60)
            resp = requests.get(url, headers=SIGA_HEADERS, json=json, timeout=30)

        resp.raise_for_status()
        return resp.json()
