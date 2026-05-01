import io
import json
import os
import re
import time
import urllib.error
import urllib.request
import urllib.parse
import uuid
from datetime import datetime

import requests as req_lib
from flask import Blueprint, jsonify, render_template, request, session, redirect, url_for, send_file
from PIL import Image, ImageFilter

from kpg_publisher.scheduler import agendar, cancelar, listar, iniciar, _publicar_carrossel

kpg_bp = Blueprint('kpg', __name__, url_prefix='/kpg')

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'temp_imgs')
os.makedirs(TEMP_DIR, exist_ok=True)

# Tamanho alvo Instagram (quadrado)
IG_SIZE = 1080


def _imgbb_key():
    val = os.environ.get('IMGBB_API_KEY', '')
    if val and 'CHAVE' not in val:
        return val
    try:
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('IMGBB_API_KEY='):
                    k = line.split('=', 1)[1].strip()
                    return k if k and 'CHAVE' not in k else ''
    except Exception:
        pass
    return ''


def _processar_e_hospedar(url: str) -> str | None:
    """
    Baixa, aplica blur-fill 1:1 e sobe para ImgBB.
    Retorna a URL pública da imagem processada (ou None se falhar).
    """
    imgbb = _imgbb_key()
    if not imgbb:
        return None

    try:
        # Download
        resp = req_lib.get(url, timeout=20, headers={'User-Agent': 'Mozilla/5.0'})
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert('RGB')

        w, h = img.size
        ratio = w / h

        if abs(ratio - 1.0) >= 0.02:
            # Canvas quadrado com blur-fill
            canvas = Image.new('RGB', (IG_SIZE, IG_SIZE))
            bg = img.resize((IG_SIZE, IG_SIZE), Image.LANCZOS)
            bg = bg.filter(ImageFilter.GaussianBlur(radius=28))
            canvas.paste(bg, (0, 0))

            if ratio > 1:
                new_w, new_h = IG_SIZE, int(IG_SIZE / ratio)
            else:
                new_w, new_h = int(IG_SIZE * ratio), IG_SIZE

            img_resized = img.resize((new_w, new_h), Image.LANCZOS)
            x, y = (IG_SIZE - new_w) // 2, (IG_SIZE - new_h) // 2
            canvas.paste(img_resized, (x, y))
            img = canvas

        # Salvar em buffer
        buf = io.BytesIO()
        img.save(buf, 'JPEG', quality=92)
        buf.seek(0)

        # Upload ImgBB
        upload = req_lib.post(
            'https://api.imgbb.com/1/upload',
            data={'key': imgbb},
            files={'image': ('img.jpg', buf, 'image/jpeg')},
            timeout=30
        )
        upload.raise_for_status()
        return upload.json()['data']['url']

    except Exception:
        return None

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, '.env')

# ── Helpers ───────────────────────────────────────────────────────────────────

def _token():
    """Lê token: variável de ambiente (Render) ou .env local."""
    val = os.environ.get('INSTAGRAM_ACCESS_TOKEN', '')
    if val:
        return val
    try:
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('INSTAGRAM_ACCESS_TOKEN='):
                    return line.split('=', 1)[1].strip()
    except Exception:
        pass
    return ''


def _ig_id():
    val = os.environ.get('INSTAGRAM_ACCOUNT_ID', '')
    if val:
        return val
    try:
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('INSTAGRAM_ACCOUNT_ID='):
                    return line.split('=', 1)[1].strip()
    except Exception:
        pass
    return '17841408846946904'


def _logged():
    return session.get('logged_in') is True


SITE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.kpgimoveis.com.br/',
}


def _buscar_imovel(codigo):
    resp = req_lib.get(
        f'https://www.kpgimoveis.com.br/api/imovel/{codigo}',
        headers=SITE_HEADERS, timeout=30
    )
    resp.raise_for_status()
    return resp.json().get('data', {})


def _extrair_fotos(data):
    fotos = []
    raw = data.get('Fotos', {})
    if isinstance(raw, dict):
        for pasta, itens in raw.items():
            for f in itens:
                url = f.get('Foto_Grande') or f.get('Foto_Media', '')
                if url:
                    fotos.append({'url': url, 'pasta': pasta,
                                  'titulo': f.get('Titulo', '') or pasta})
    elif isinstance(raw, list):
        for f in raw:
            url = f.get('Foto_Grande') or f.get('Foto_Media', '')
            if url:
                fotos.append({'url': url, 'pasta': 'Apresentacao', 'titulo': ''})

    for f in data.get('FotosEdificio', []):
        url = f.get('Foto_Grande') or f.get('Foto_Media', '')
        if url:
            fotos.append({'url': url, 'pasta': 'Edificio',
                          'titulo': f.get('Titulo', '') or 'Empreendimento'})
    return fotos


def _gerar_caption(data, telefone=''):
    nome = (data.get('Anuncio') or data.get('Nome') or '').replace('_', ' ').strip()
    bairro = data.get('Bairro', '')
    cidade = data.get('Cidade', '')
    uf = (data.get('UF') or '').upper()
    perfil = data.get('Perfil', '')
    tipos = data.get('Tipo', [{}])
    valor = tipos[0].get('Valor', '') if tipos else ''
    dorms = tipos[0].get('Dormitorios', '') if tipos else ''
    area = data.get('AreaPrivativa') or data.get('AreaGlobal', '')
    suites = data.get('Suites', '')
    garagem = data.get('Garagem', '')
    desc_raw = (data.get('Descricao') or [{}])[0].get('Texto', '')
    desc = re.sub(r'<[^>]+>', '', desc_raw).strip()
    desc_trecho = desc[:300].rstrip(',').strip()

    linhas = [f'✨ {nome}', '']
    if desc_trecho:
        linhas += [desc_trecho + ('...' if len(desc) > 300 else ''), '']

    local = ', '.join(filter(None, [bairro, cidade]))
    if local:
        linhas.append(f'📍 {local} - {uf}')
    if perfil:
        linhas.append(f'🏷 {perfil}')
    linhas.append('')

    specs = []
    if dorms:
        specs.append(f'🛏 {dorms} dorm{"s" if int(str(dorms)) > 1 else ""}')
    if suites:
        try:
            s = int(str(suites))
            if s:
                specs.append(f'🛁 {s} suíte{"s" if s > 1 else ""}')
        except Exception:
            pass
    if area:
        specs.append(f'📐 {area} m²')
    if garagem:
        try:
            g = int(str(garagem))
            if g:
                specs.append(f'🚗 {g} vaga{"s" if g > 1 else ""}')
        except Exception:
            pass
    if specs:
        linhas += [' | '.join(specs), '']

    if valor:
        linhas += [f'💰 A partir de R$ {valor}', '']

    if telefone:
        linhas += ['📲 Agende sua visita:', f'wa.me/{telefone}', '']

    hashtags = ['#KPGImoveis']
    if cidade:
        hashtags.append(f'#{cidade.replace(" ", "")}Imoveis')
    if perfil:
        tag = perfil.replace(' ', '').replace('ã', 'a').replace('â', 'a').replace('ç', 'c')
        hashtags.append(f'#{tag}')
    hashtags += ['#SerraGaucha', '#ImoveisRS', '#AltoPadrao', '#CorretorDeImoveis']
    linhas.append(' '.join(hashtags))

    return '\n'.join(linhas)


# ── Rotas ─────────────────────────────────────────────────────────────────────

@kpg_bp.route('/img/<fname>')
def temp_img(fname):
    """Serve imagens processadas para o Instagram acessar via URL pública."""
    path = os.path.join(TEMP_DIR, fname)
    if not os.path.exists(path):
        return '', 404
    return send_file(path, mimetype='image/jpeg')


@kpg_bp.route('/')
def index():
    if not _logged():
        return redirect(url_for('login'))
    return render_template('kpg_publisher.html')


@kpg_bp.route('/api/token/status')
def token_status():
    token = _token()
    try:
        url = f'https://graph.facebook.com/v19.0/debug_token?input_token={token}&access_token={token}'
        with urllib.request.urlopen(url, timeout=10) as r:
            info = json.loads(r.read()).get('data', {})
        return jsonify({
            'valido': info.get('is_valid', False),
            'tipo': info.get('type', ''),
            'app': info.get('application', ''),
            'expira': info.get('expires_at', 0),
            'permanente': info.get('expires_at', 1) == 0,
        })
    except Exception as e:
        return jsonify({'valido': False, 'erro': str(e)})


@kpg_bp.route('/api/preview', methods=['POST'])
def preview():
    if not _logged():
        return jsonify({'erro': 'Não autorizado'}), 401
    body = request.get_json() or {}
    codigo = str(body.get('codigo', '')).strip()
    telefone = str(body.get('telefone', '')).strip()

    if not codigo:
        return jsonify({'erro': 'Código obrigatório'}), 400
    try:
        data = _buscar_imovel(codigo)
        fotos = _extrair_fotos(data)
        caption = _gerar_caption(data, telefone)

        tipos = data.get('Tipo', [{}])
        return jsonify({
            'codigo': codigo,
            'nome': (data.get('Anuncio') or data.get('Nome') or '').replace('_', ' ').strip(),
            'bairro': data.get('Bairro', ''),
            'cidade': data.get('Cidade', ''),
            'uf': data.get('UF', ''),
            'perfil': data.get('Perfil', ''),
            'valor': tipos[0].get('Valor', '') if tipos else '',
            'area': data.get('AreaPrivativa') or data.get('AreaGlobal', ''),
            'dormitorios': tipos[0].get('Dormitorios', '') if tipos else '',
            'fotos': fotos,
            'caption': caption,
        })
    except Exception as e:
        return jsonify({'erro': f'Erro ao buscar imóvel: {str(e)}'}), 500


@kpg_bp.route('/api/publicar', methods=['POST'])
def publicar():
    if not _logged():
        return jsonify({'erro': 'Não autorizado'}), 401
    body = request.get_json() or {}
    fotos_originais = body.get('fotos', [])
    caption = body.get('caption', '')
    codigo = str(body.get('codigo', ''))
    redimensionar = body.get('redimensionar', True)

    if not fotos_originais:
        return jsonify({'erro': 'Nenhuma foto selecionada'}), 400
    if not caption.strip():
        return jsonify({'erro': 'Legenda não pode estar vazia'}), 400

    if redimensionar and not _imgbb_key():
        return jsonify({'erro': 'Configure IMGBB_API_KEY no arquivo .env para usar redimensionamento. Chave gratuita em imgbb.com → API → My API Key'}), 400

    token = _token()
    ig_id = _ig_id()

    try:
        # Montar URLs finais (originais ou processadas)
        fotos_urls = []
        if redimensionar:
            for url_orig in fotos_originais[:4]:
                pub_url = _processar_e_hospedar(url_orig)
                fotos_urls.append(pub_url if pub_url else url_orig)
        else:
            fotos_urls = fotos_originais[:4]

        container_ids = []
        for url in fotos_urls:
            data = urllib.parse.urlencode({
                'image_url': url,
                'is_carousel_item': 'true',
                'access_token': token,
            }).encode()
            r = urllib.request.Request(
                f'https://graph.facebook.com/v19.0/{ig_id}/media',
                data=data, method='POST'
            )
            with urllib.request.urlopen(r, timeout=30) as resp:
                res = json.loads(resp.read())
            if 'id' in res:
                container_ids.append(res['id'])
            time.sleep(1)

        if not container_ids:
            return jsonify({'erro': 'Falha ao criar containers de mídia'}), 500

        if len(container_ids) == 1:
            pub_data = urllib.parse.urlencode({
                'creation_id': container_ids[0],
                'access_token': token,
            }).encode()
        else:
            car_data = urllib.parse.urlencode({
                'media_type': 'CAROUSEL',
                'children': ','.join(container_ids),
                'caption': caption,
                'access_token': token,
            }).encode()
            r2 = urllib.request.Request(
                f'https://graph.facebook.com/v19.0/{ig_id}/media',
                data=car_data, method='POST'
            )
            with urllib.request.urlopen(r2, timeout=30) as resp:
                carousel = json.loads(resp.read())
            time.sleep(3)
            pub_data = urllib.parse.urlencode({
                'creation_id': carousel['id'],
                'access_token': token,
            }).encode()

        r3 = urllib.request.Request(
            f'https://graph.facebook.com/v19.0/{ig_id}/media_publish',
            data=pub_data, method='POST'
        )
        with urllib.request.urlopen(r3, timeout=30) as resp:
            pub = json.loads(resp.read())

        post_id = pub.get('id', '')
        return jsonify({'sucesso': True, 'post_id': post_id, 'codigo': codigo})
    except urllib.error.HTTPError as e:
        erro = e.read().decode('utf-8', errors='replace')
        return jsonify({'erro': f'Meta API: {erro}'}), 500
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


@kpg_bp.route('/api/agendar', methods=['POST'])
def agendar_post():
    if not _logged():
        return jsonify({'erro': 'Não autorizado'}), 401
    body = request.get_json() or {}
    fotos = body.get('fotos', [])
    caption = body.get('caption', '')
    codigo = str(body.get('codigo', ''))
    nome = body.get('nome', codigo)
    data_hora_str = body.get('data_hora', '')

    if not fotos or not caption.strip() or not data_hora_str:
        return jsonify({'erro': 'Fotos, legenda e data/hora são obrigatórios'}), 400

    try:
        data_hora = datetime.fromisoformat(data_hora_str)
        if data_hora <= datetime.now():
            return jsonify({'erro': 'Data/hora deve ser no futuro'}), 400
    except ValueError:
        return jsonify({'erro': 'Formato de data/hora inválido'}), 400

    job_id = str(uuid.uuid4())[:8]
    token = _token()
    ig_id = _ig_id()

    agendar(job_id, fotos, caption, token, ig_id, data_hora, codigo, nome)

    return jsonify({
        'sucesso': True,
        'job_id': job_id,
        'agendado_para': data_hora.strftime('%d/%m/%Y %H:%M'),
    })


@kpg_bp.route('/api/agendados')
def agendados():
    if not _logged():
        return jsonify({'erro': 'Não autorizado'}), 401
    return jsonify(listar())


@kpg_bp.route('/api/agendados/<job_id>', methods=['DELETE'])
def cancelar_agendamento(job_id):
    if not _logged():
        return jsonify({'erro': 'Não autorizado'}), 401
    cancelar(job_id)
    return jsonify({'sucesso': True})


@kpg_bp.route('/api/debug')
def debug_env():
    if not _logged():
        return jsonify({'erro': 'Não autorizado'}), 401
    token = _token()
    ig_id = _ig_id()
    # Testa a API do Meta diretamente
    resultado = {}
    if not token:
        resultado['token'] = 'AUSENTE — INSTAGRAM_ACCESS_TOKEN não encontrado'
    else:
        resultado['token'] = f'OK — {token[:12]}...{token[-6:]}'
        try:
            url = f'https://graph.facebook.com/v19.0/{ig_id}?fields=username&access_token={token}'
            with urllib.request.urlopen(url, timeout=10) as r:
                data = json.loads(r.read())
            resultado['meta_api'] = f'OK — username: {data.get("username", "?")}'
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            resultado['meta_api'] = f'ERRO {e.code}: {body}'
        except Exception as e:
            resultado['meta_api'] = f'ERRO: {str(e)}'
    resultado['ig_id'] = ig_id
    return jsonify(resultado)


@kpg_bp.route('/api/instagram/perfil')
def instagram_perfil():
    if not _logged():
        return jsonify({'erro': 'Não autorizado'}), 401
    token = _token()
    ig_id = _ig_id()
    if not token:
        return jsonify({'erro': 'INSTAGRAM_ACCESS_TOKEN não configurado no ambiente'}), 500
    try:
        url = (
            f'https://graph.facebook.com/v19.0/{ig_id}'
            f'?fields=name,username,biography,followers_count,media_count,profile_picture_url,website'
            f'&access_token={token}'
        )
        with urllib.request.urlopen(url, timeout=15) as r:
            data = json.loads(r.read())
        return jsonify({'sucesso': True, 'perfil': data})
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        return jsonify({'erro': f'Meta API {e.code}: {body}'}), 500
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


@kpg_bp.route('/api/instagram/posts')
def instagram_posts():
    if not _logged():
        return jsonify({'erro': 'Não autorizado'}), 401
    token = _token()
    ig_id = _ig_id()
    if not token:
        return jsonify({'erro': 'INSTAGRAM_ACCESS_TOKEN não configurado no ambiente'}), 500
    try:
        url = (
            f'https://graph.facebook.com/v19.0/{ig_id}/media'
            f'?fields=id,media_type,thumbnail_url,media_url,caption,timestamp,like_count,comments_count,permalink'
            f'&limit=12&access_token={token}'
        )
        with urllib.request.urlopen(url, timeout=15) as r:
            data = json.loads(r.read())
        return jsonify({'sucesso': True, 'posts': data.get('data', [])})
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        return jsonify({'erro': f'Meta API {e.code}: {body}'}), 500
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


def init_app(app):
    iniciar()
    app.register_blueprint(kpg_bp)
