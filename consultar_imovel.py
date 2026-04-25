import requests
import json
import os
import time
from urllib.parse import urlparse

TOKEN = "83mXBavPZeoPqOSAnJbhAUKvqrcUJVLvF8UHL5eLA"
BASE_URL = "https://api.sigacrm.com.br/kpg"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}


def buscar_por_codigo(codigo):
    """Busca imóvel pelo código cadastrado no CRM SIGA."""
    url = f"{BASE_URL}/imoveis"
    body = {"codigoImovel": codigo}
    resp = requests.get(url, headers=HEADERS, json=body)

    if resp.status_code == 429:
        print("Limite de requisições atingido. Aguardando 60 segundos...")
        time.sleep(60)
        resp = requests.get(url, headers=HEADERS, json=body)

    resp.raise_for_status()
    data = resp.json().get("data", [])

    if not data:
        print(f"Nenhum imóvel encontrado com o código {codigo}.")
        return None

    return data[0]


def buscar_detalhes(id_imovel):
    """Busca detalhes completos de um imóvel pelo ID interno."""
    url = f"{BASE_URL}/imovel/{id_imovel}"
    resp = requests.get(url, headers=HEADERS)

    if resp.status_code == 429:
        print("Limite de requisições atingido. Aguardando 60 segundos...")
        time.sleep(60)
        resp = requests.get(url, headers=HEADERS)

    resp.raise_for_status()
    return resp.json().get("data", {})


def baixar_imagens(imovel, pasta_destino):
    """Baixa todas as fotos do imóvel para uma pasta local."""
    os.makedirs(pasta_destino, exist_ok=True)

    fotos = imovel.get("Fotos", {})
    if isinstance(fotos, list):
        lista_fotos = fotos
    elif isinstance(fotos, dict):
        lista_fotos = []
        for itens in fotos.values():
            lista_fotos.extend(itens)
    else:
        lista_fotos = []

    fotos_edificio = imovel.get("FotosEdificio", [])

    total = 0
    for i, foto in enumerate(lista_fotos):
        url = foto.get("Foto_Grande") or foto.get("Foto_Media") or foto.get("Foto_Pequena")
        if url:
            nome = f"imovel_{i+1:02d}_{os.path.basename(urlparse(url).path)}"
            _salvar_foto(url, os.path.join(pasta_destino, nome))
            total += 1

    for i, foto in enumerate(fotos_edificio):
        url = foto.get("Foto_Grande") or foto.get("Foto_Media") or foto.get("Foto_Pequena")
        if url:
            titulo = foto.get("Titulo") or f"edificio_{i+1:02d}"
            nome = f"edificio_{i+1:02d}_{os.path.basename(urlparse(url).path)}"
            _salvar_foto(url, os.path.join(pasta_destino, nome))
            total += 1

    print(f"{total} imagem(ns) baixada(s) em: {pasta_destino}")


def _salvar_foto(url, caminho):
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        with open(caminho, "wb") as f:
            f.write(resp.content)
        print(f"  OK: {os.path.basename(caminho)}")
    except Exception as e:
        print(f"  ERRO ao baixar {url}: {e}")


def exibir_resumo(imovel):
    """Exibe um resumo formatado do imóvel no terminal."""
    print("\n" + "="*60)
    print(f"  {imovel.get('Nome', 'Sem nome')}")
    print("="*60)
    print(f"  Codigo:      {imovel.get('Codigo')}")
    print(f"  ID interno:  {imovel.get('ID')}")
    print(f"  Categoria:   {imovel.get('Categoria')}")
    print(f"  Situacao:    {imovel.get('Situacao', '-')}")
    print(f"  Perfil:      {imovel.get('Perfil', '-')}")

    tipos = imovel.get("Tipo", [])
    if tipos:
        print("\n  TIPOS/VALORES:")
        for t in tipos:
            print(f"    - {t.get('Tipo')} | {t.get('Dormitorios')} dorm | R$ {t.get('Valor')}")

    print(f"\n  LOCALIZACAO:")
    print(f"    {imovel.get('Endereco', 'Endereço restrito')}, {imovel.get('Bairro')}")
    print(f"    {imovel.get('Cidade')} - {imovel.get('UF')}")

    print(f"\n  AREAS:")
    print(f"    Privativa:  {imovel.get('AreaPrivativa')} m²")
    print(f"    Global:     {imovel.get('AreaGlobal')} m²")

    print(f"\n  DETALHES:")
    print(f"    Garagem:    {imovel.get('Garagem')}")
    print(f"    Suites:     {imovel.get('Suites')}")
    print(f"    Banheiros:  {imovel.get('Banheiros')}")
    print(f"    Mobilia:    {imovel.get('Mobilia', '-')}")

    cond = imovel.get("ValorCondominio")
    iptu = imovel.get("ValorIPTU")
    if cond:
        print(f"    Condominio: R$ {cond}")
    if iptu:
        print(f"    IPTU:       R$ {iptu}")

    ag = imovel.get("Agenciador", {})
    if ag:
        print(f"\n  CORRETOR:")
        print(f"    {ag.get('Nome')} | {ag.get('Fone')} | {ag.get('Email')}")

    fotos = imovel.get("Fotos", {})
    qtd_fotos = len(fotos) if isinstance(fotos, list) else sum(len(v) for v in fotos.values())
    print(f"\n  FOTOS: {qtd_fotos} foto(s) do imóvel")
    print(f"  FOTOS EDIFICIO: {len(imovel.get('FotosEdificio', []))} foto(s)")
    print(f"\n  URL: {imovel.get('URL', '-')}")
    print("="*60)


def salvar_json(imovel, caminho):
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(imovel, f, ensure_ascii=False, indent=2)
    print(f"JSON salvo em: {caminho}")


def main():
    print("=== Consulta de Imóvel — KPG SIGA CRM ===\n")
    codigo = input("Informe o código do imóvel: ").strip()

    if not codigo:
        print("Código não informado.")
        return

    print(f"\nBuscando imóvel com código {codigo}...")
    resumo = buscar_por_codigo(codigo)
    if not resumo:
        return

    id_interno = resumo.get("ID")
    print(f"Imóvel encontrado! ID interno: {id_interno}. Buscando detalhes...")

    time.sleep(1)
    imovel = buscar_detalhes(id_interno)
    exibir_resumo(imovel)

    pasta = os.path.join(os.path.dirname(__file__), f"imovel_{codigo}")
    os.makedirs(pasta, exist_ok=True)

    salvar_json(imovel, os.path.join(pasta, "dados.json"))

    baixar = input("\nDeseja baixar as imagens? (s/n): ").strip().lower()
    if baixar == "s":
        baixar_imagens(imovel, os.path.join(pasta, "fotos"))

    print(f"\nConcluido! Dados salvos em: {pasta}")


if __name__ == "__main__":
    main()
