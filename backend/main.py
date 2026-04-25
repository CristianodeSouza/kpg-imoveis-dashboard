import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from agents.siga_extractor import SigaExtractor
from agents.creative_builder import CreativeBuilder
from agents.instagram_publisher import InstagramPublisher
from skills.caption_generator import CaptionGenerator
from config import CRIATIVOS_DIR

app = FastAPI(title="KPG Imóveis Publisher", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="frontend")
app.mount("/criativos", StaticFiles(directory=CRIATIVOS_DIR), name="criativos")

siga = SigaExtractor()
criativo = CreativeBuilder()
instagram = InstagramPublisher()
caption_gen = CaptionGenerator()


class BuscarRequest(BaseModel):
    codigo: int


class GerarRequest(BaseModel):
    codigo: int
    id_imovel: int


class PublicarRequest(BaseModel):
    codigo: int
    id_imovel: int
    caption: str = ""
    publicar_feed: bool = True
    publicar_stories: bool = True
    publicar_reels: bool = True


@app.get("/")
def index():
    return FileResponse(os.path.join(frontend_dir, "index.html"))


@app.post("/api/buscar")
def buscar_imovel(req: BuscarRequest):
    try:
        imovel_raw = siga.buscar_imovel_completo(req.codigo)
        resumo = siga.extrair_resumo(imovel_raw)
        return {"sucesso": True, "imovel": resumo}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar imóvel: {str(e)}")


@app.post("/api/criativos/gerar")
def gerar_criativos(req: GerarRequest):
    try:
        imovel_raw = siga.buscar_detalhes(req.id_imovel)
        resumo = siga.extrair_resumo(imovel_raw)
        fotos = resumo["fotos"]

        criativos = criativo.gerar_todos(resumo, fotos)
        caption = caption_gen.gerar(resumo)

        # Converte caminhos para URLs relativas
        def to_url(caminho):
            rel = os.path.relpath(caminho, CRIATIVOS_DIR).replace("\\", "/")
            return f"/criativos/{rel}"

        return {
            "sucesso": True,
            "caption": caption,
            "criativos": {
                "feed": [to_url(p) for p in criativos["feed"]],
                "stories": [to_url(p) for p in criativos["stories"]],
                "carousel": [to_url(p) for p in criativos["carousel"]],
            },
            "criativos_paths": criativos,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar criativos: {str(e)}")


@app.post("/api/publicar")
def publicar_instagram(req: PublicarRequest):
    try:
        # Recupera os criativos gerados
        import glob as glob_mod
        pasta = os.path.join(CRIATIVOS_DIR, str(req.codigo))

        carousel = sorted(glob_mod.glob(os.path.join(pasta, "carousel_*.jpg")))
        stories = glob_mod.glob(os.path.join(pasta, "stories.jpg"))

        criativos_pub = {}
        if req.publicar_feed and carousel:
            criativos_pub["carousel"] = carousel
        if req.publicar_stories and stories:
            criativos_pub["stories"] = stories

        # Busca vídeo se solicitado
        video_url = None
        if req.publicar_reels:
            imovel_raw = siga.buscar_detalhes(req.id_imovel)
            video_url = imovel_raw.get("Video") or None

        resultado = instagram.publicar_tudo(
            criativos=criativos_pub,
            caption=req.caption,
            video_url=video_url
        )

        return {"sucesso": True, "resultado": resultado}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao publicar: {str(e)}")


@app.get("/api/status")
def status():
    from config import INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID, IMGBB_API_KEY, ANTHROPIC_API_KEY
    return {
        "siga": "configurado",
        "instagram": "configurado" if INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID else "pendente",
        "imgbb": "configurado" if IMGBB_API_KEY else "pendente",
        "ia_caption": "configurado" if ANTHROPIC_API_KEY else "template (sem IA)",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
