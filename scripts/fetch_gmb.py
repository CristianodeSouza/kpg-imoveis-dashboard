"""
fetch_gmb.py — Busca dados do Google Meu Negócio e salva em data/gmb.json
Uso: python scripts/fetch_gmb.py  (a partir da pasta raiz KPG IMOVEIS)
Na primeira execução abre o navegador para login. Nas próximas, usa token salvo.
"""
import json, os, datetime, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    import requests as http
except ImportError:
    print("Instalando dependências...")
    os.system(f"{sys.executable} -m pip install google-auth-oauthlib google-auth requests")
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    import requests as http

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR      = os.path.dirname(BASE_DIR)
CLIENT_SECRET = os.path.join(BASE_DIR, "client_secret.json")
TOKEN_FILE    = os.path.join(BASE_DIR, "gmb_token.json")
GMB_JSON      = os.path.join(ROOT_DIR, "data", "gmb.json")

SCOPES = ["https://www.googleapis.com/auth/business.manage"]

def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return creds

def api(creds, url, method="GET", body=None, retries=5):
    headers = {"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"}
    for attempt in range(retries):
        r = http.post(url, headers=headers, json=body) if method == "POST" else http.get(url, headers=headers)
        if r.status_code == 429:
            wait = 20 * (attempt + 1)
            print(f"  Rate limit, aguardando {wait}s...")
            time.sleep(wait)
            continue
        if not r.ok:
            raise RuntimeError(f"API {r.status_code}: {r.text[:300]}")
        return r.json()
    raise RuntimeError("Rate limit: tente novamente em alguns minutos.")

def sum_arr(arr): return sum(int(x) for x in arr)
def pct(n, t): return f"{round(n/t*100)}%" if t else "—"

def fetch_data(creds):
    print("→ Buscando conta...")
    accs = api(creds, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts")
    if not accs.get("accounts"):
        raise RuntimeError("Nenhuma conta GMB encontrada.")
    account = accs["accounts"][0]["name"]

    print("→ Buscando estabelecimento...")
    locs = api(creds, f"https://mybusinessbusinessinformation.googleapis.com/v1/{account}/locations?readMask=name,title,storefrontAddress")
    if not locs.get("locations"):
        raise RuntimeError("Nenhum estabelecimento encontrado.")
    loc      = locs["locations"][0]
    location = loc["name"]
    biz_name = loc.get("title", "—")
    a        = loc.get("storefrontAddress", {})
    biz_addr = ", ".join(filter(None, [", ".join(a.get("addressLines", [])), a.get("locality",""), a.get("administrativeArea","")])) or "—"

    print("→ Buscando métricas (30 dias)...")
    end   = datetime.date.today()
    start = end - datetime.timedelta(days=29)
    fmt_d = lambda d: {"year": d.year, "month": d.month, "day": d.day}

    perf = api(creds,
        f"https://businessprofileperformance.googleapis.com/v1/{location}:fetchMultiDailyMetricsTimeSeries",
        method="POST",
        body={
            "dailyMetrics": ["BUSINESS_IMPRESSIONS_DESKTOP_MAPS","BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
                             "BUSINESS_IMPRESSIONS_MOBILE_MAPS","BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
                             "CALL_CLICKS","DIRECTION_REQUESTS","WEBSITE_CLICKS"],
            "dailyRange": {"startDate": fmt_d(start), "endDate": fmt_d(end)}
        }
    )

    metrics = {}
    for m in perf.get("multiDailyMetricTimeSeries", []):
        for ts in m.get("dailyMetricTimeSeries", []):
            metrics[ts["dailyMetric"]] = [int(dv.get("value", 0)) for dv in ts.get("timeSeries", {}).get("datedValues", [])]

    def g(k): return (metrics.get(k, []) + [0]*30)[:30]
    d_maps,d_srch,m_maps,m_srch = g("BUSINESS_IMPRESSIONS_DESKTOP_MAPS"),g("BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"),g("BUSINESS_IMPRESSIONS_MOBILE_MAPS"),g("BUSINESS_IMPRESSIONS_MOBILE_SEARCH")
    calls,dirs,web = g("CALL_CLICKS"),g("DIRECTION_REQUESTS"),g("WEBSITE_CLICKS")

    tot_desktop = sum_arr(d_maps)+sum_arr(d_srch)
    tot_mobile  = sum_arr(m_maps)+sum_arr(m_srch)
    tot_maps    = sum_arr(d_maps)+sum_arr(m_maps)
    tot_search  = sum_arr(d_srch)+sum_arr(m_srch)
    tot_views   = tot_desktop+tot_mobile

    labels = [f"{(start+datetime.timedelta(days=i)).day}/{(start+datetime.timedelta(days=i)).month}" for i in range(30)]

    rating, reviews = "—", "—"
    try:
        rv = api(creds, f"https://mybusiness.googleapis.com/v4/{location}/reviews?pageSize=1")
        if rv.get("averageRating"):
            rating  = f"⭐ {float(rv['averageRating']):.1f}"
            reviews = f"{rv.get('totalReviewCount',0)} avaliações"
    except Exception:
        pass

    return {
        "bizName": biz_name, "bizAddr": biz_addr,
        "rating": rating, "reviews": reviews,
        "totalViews": tot_views, "searchViews": tot_search, "mapsViews": tot_maps,
        "calls": sum_arr(calls), "directions": sum_arr(dirs), "website": sum_arr(web),
        "mobilePct": pct(tot_mobile,tot_views), "desktopPct": pct(tot_desktop,tot_views),
        "searchPct": pct(tot_search,tot_views),  "mapsPct": pct(tot_maps,tot_views),
        "labels": labels,
        "dailyViews":   [d_maps[i]+d_srch[i]+m_maps[i]+m_srch[i] for i in range(30)],
        "dailyActions": [calls[i]+dirs[i]+web[i] for i in range(30)],
        "updated": f"Atualizado {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}",
    }

if __name__ == "__main__":
    print("=== Google Meu Negócio — Fetch ===")
    os.makedirs(os.path.dirname(GMB_JSON), exist_ok=True)
    creds = get_credentials()
    data  = fetch_data(creds)
    with open(GMB_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✓ Salvo em: {GMB_JSON}")
    print(f"✓ Views: {data['totalViews']} | Ligações: {data['calls']} | Rotas: {data['directions']}")
