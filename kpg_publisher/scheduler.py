import json
import os
import time
import urllib.request
import urllib.parse
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'data', 'agendamentos.db')
META_PATH = os.path.join(BASE_DIR, 'data', 'agendamentos_meta.json')

jobstores = {
    'default': SQLAlchemyJobStore(url=f'sqlite:///{DB_PATH}')
}

scheduler = BackgroundScheduler(jobstores=jobstores, timezone='America/Sao_Paulo')


def _load_meta():
    if os.path.exists(META_PATH):
        with open(META_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def _save_meta(meta):
    os.makedirs(os.path.dirname(META_PATH), exist_ok=True)
    with open(META_PATH, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


def _publicar_carrossel(fotos: list, caption: str, token: str, ig_id: str, job_id: str):
    meta = _load_meta()
    try:
        container_ids = []
        for url in fotos[:10]:
            data = urllib.parse.urlencode({
                'image_url': url,
                'is_carousel_item': 'true',
                'access_token': token,
            }).encode()
            req = urllib.request.Request(
                f'https://graph.facebook.com/v19.0/{ig_id}/media',
                data=data, method='POST'
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                resp = json.loads(r.read())
            if 'id' in resp:
                container_ids.append(resp['id'])
            time.sleep(1)

        if len(container_ids) == 1:
            # Post único
            data2 = urllib.parse.urlencode({
                'creation_id': container_ids[0],
                'access_token': token,
            }).encode()
        else:
            # Carrossel
            data_carousel = urllib.parse.urlencode({
                'media_type': 'CAROUSEL',
                'children': ','.join(container_ids),
                'caption': caption,
                'access_token': token,
            }).encode()
            req2 = urllib.request.Request(
                f'https://graph.facebook.com/v19.0/{ig_id}/media',
                data=data_carousel, method='POST'
            )
            with urllib.request.urlopen(req2, timeout=30) as r:
                carousel = json.loads(r.read())
            time.sleep(3)
            data2 = urllib.parse.urlencode({
                'creation_id': carousel['id'],
                'access_token': token,
            }).encode()

        req3 = urllib.request.Request(
            f'https://graph.facebook.com/v19.0/{ig_id}/media_publish',
            data=data2, method='POST'
        )
        with urllib.request.urlopen(req3, timeout=30) as r:
            pub = json.loads(r.read())

        post_id = pub.get('id', '')
        if job_id in meta:
            meta[job_id]['status'] = 'publicado'
            meta[job_id]['post_id'] = post_id
            meta[job_id]['publicado_em'] = datetime.now().strftime('%d/%m/%Y %H:%M')
    except Exception as e:
        if job_id in meta:
            meta[job_id]['status'] = 'erro'
            meta[job_id]['erro'] = str(e)

    _save_meta(meta)


def agendar(job_id: str, fotos: list, caption: str, token: str, ig_id: str,
            data_hora, codigo: str, nome_imovel: str):
    scheduler.add_job(
        _publicar_carrossel,
        'date',
        run_date=data_hora,
        args=[fotos, caption, token, ig_id, job_id],
        id=job_id,
        replace_existing=True,
        misfire_grace_time=3600,
    )
    meta = _load_meta()
    meta[job_id] = {
        'job_id': job_id,
        'codigo': codigo,
        'nome': nome_imovel,
        'status': 'agendado',
        'data_hora': data_hora.strftime('%d/%m/%Y %H:%M') if hasattr(data_hora, 'strftime') else str(data_hora),
        'caption_preview': caption[:120] + '...' if len(caption) > 120 else caption,
        'total_fotos': len(fotos),
        'criado_em': datetime.now().strftime('%d/%m/%Y %H:%M'),
    }
    _save_meta(meta)


def cancelar(job_id: str):
    try:
        scheduler.remove_job(job_id)
    except Exception:
        pass
    meta = _load_meta()
    if job_id in meta:
        meta[job_id]['status'] = 'cancelado'
        _save_meta(meta)


def listar():
    meta = _load_meta()
    jobs_ativos = {j.id for j in scheduler.get_jobs()}
    result = []
    for jid, info in sorted(meta.items(), key=lambda x: x[1].get('criado_em', ''), reverse=True):
        # Sincroniza status com scheduler
        if info.get('status') == 'agendado' and jid not in jobs_ativos:
            info['status'] = 'expirado'
        result.append(info)
    return result


def iniciar():
    if not scheduler.running:
        scheduler.start()
