"""
KPG Imóveis Dashboard — Servidor Web
Execute: python app.py
Acesse: http://localhost:5000 (local) ou http://[IP]:5000 (rede)
"""
import json, os, subprocess, sys, socket
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from datetime import datetime
from flask import make_response

APP_VERSION    = "1.2.0"
APP_VERSION_DATE = "01/05/2026 — Dashboard unificado Analytics + Publisher"
SERVER_STARTED = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, 'data')
SCRIPTS   = os.path.join(BASE_DIR, 'scripts')
os.makedirs(DATA_DIR, exist_ok=True)

app = Flask(__name__)
app.secret_key = 'kpg_imoveis_dashboard_2026_secret'

@app.context_processor
def inject_version():
    return dict(
        app_version=APP_VERSION,
        app_version_date=APP_VERSION_DATE,
        server_started=SERVER_STARTED,
    )

# ── KPG Publisher (Instagram) ─────────────────────────────────────────────────
from kpg_publisher import init_app as init_publisher
init_publisher(app)

# ── Helpers ───────────────────────────────────────────────────────────────────
def no_cache(f):
    def decorated_function(*args, **kwargs):
        resp = make_response(f(*args, **kwargs))
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
        return resp
    decorated_function.__name__ = f.__name__
    return decorated_function

def load_json(name, default=None):
    path = os.path.join(DATA_DIR, f'{name}.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default or {}

def save_json(name, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(os.path.join(DATA_DIR, f'{name}.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_password():
    return load_json('config').get('password', 'kpg2026')

def logged_in():
    return session.get('logged_in') is True

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.route('/login', methods=['GET', 'POST'])
@no_cache
def login():
    error = None
    if request.method == 'POST':
        if request.form.get('password') == get_password():
            session['logged_in'] = True
            session['user'] = request.form.get('user', 'Equipe')
            return redirect(url_for('kpg.index'))
        error = 'Senha incorreta. Tente novamente.'
    return render_template('login_v2.html', error=error)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return redirect(url_for('kpg.index'))

# ── API ───────────────────────────────────────────────────────────────────────
@app.route('/api/gmb')
def api_gmb():
    if not logged_in():
        return jsonify({'error': 'Não autorizado'}), 401
    return jsonify(load_json('gmb', {}))

@app.route('/api/refresh-gmb', methods=['POST'])
def api_refresh_gmb():
    if not logged_in():
        return jsonify({'error': 'Não autorizado'}), 401
    script = os.path.join(SCRIPTS, 'fetch_gmb.py')
    try:
        result = subprocess.run(
            [sys.executable, '-u', script],
            capture_output=True, text=True, timeout=300,
            env={**os.environ, 'PYTHONIOENCODING': 'utf-8'}
        )
        if result.returncode == 0:
            return jsonify({'success': True, 'output': result.stdout[-500:]})
        return jsonify({'success': False, 'error': result.stderr[-500:] or result.stdout[-500:]})
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Tempo esgotado (5 min)'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/status')
def api_status():
    return jsonify({
        'ok': True,
        'gmb_updated': load_json('gmb', {}).get('updated', '—'),
        'time': datetime.now().strftime('%d/%m/%Y %H:%M')
    })

# ── Proxy de Imagens (Instagram CDN) ────────────────────────────────────────
import urllib.request as _urllib_req

@app.route('/proxy-img')
def proxy_img():
    if not logged_in():
        return '', 403
    url = request.args.get('url', '')
    if not url:
        return '', 400
    allowed = ('fbcdn.net', 'cdninstagram.com', 'instagram.com', 'scontent.', 'fbsbx.com', 'fb.com')
    if not any(d in url for d in allowed):
        return jsonify({'erro': f'Domínio não permitido: {url[:80]}'}), 400
    try:
        req = _urllib_req.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with _urllib_req.urlopen(req, timeout=10) as r:
            data = r.read()
            ct = r.headers.get('Content-Type', 'image/jpeg')
        resp = make_response(data)
        resp.headers['Content-Type'] = ct
        resp.headers['Cache-Control'] = 'public, max-age=3600'
        return resp
    except Exception:
        return '', 404


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    os.makedirs(DATA_DIR, exist_ok=True)

    # Cria config padrão se não existir
    if not os.path.exists(os.path.join(DATA_DIR, 'config.json')):
        save_json('config', {'password': 'kpg2026', 'app_name': 'KPG Imóveis Dashboard'})
        print("  Config criada → senha padrão: kpg2026")

    try:
        hostname  = socket.gethostname()
        local_ip  = socket.gethostbyname(hostname)
    except Exception:
        local_ip = '0.0.0.0'

    print("\n" + "="*52)
    print("  🏠 KPG Imóveis Dashboard — SERVIDOR INICIADO")
    print("="*52)
    print(f"  📍 Local:  http://localhost:5000")
    print(f"  🌐 Rede:   http://{local_ip}:5000")
    print(f"  🔑 Senha:  kpg2026  (altere em data/config.json)")
    print("="*52)
    print("  Compartilhe o endereço de Rede com a equipe.")
    print("  Pressione Ctrl+C para encerrar.\n")

    app.run(host='0.0.0.0', port=5000, debug=False)
