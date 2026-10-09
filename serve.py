#!/usr/bin/env python3
"""Local server for the Tsuii's menu and dashboard.

Serves this folder, and proxies today's metal reference price so an iPad
on the same Wi-Fi does not have to call the price sites itself.
"""

import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TROY_OZ_GRAMS = 31.1034768
HOST = "0.0.0.0"
PORT = 8765


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "tsuiis-draft"})
    with urllib.request.urlopen(request, timeout=12) as response:
        return json.loads(response.read().decode())


def market_quote() -> dict:
    gold = fetch_json("https://api.gold-api.com/price/XAU")
    silver = fetch_json("https://api.gold-api.com/price/XAG")
    fx = fetch_json("https://api.frankfurter.app/latest?from=USD&to=JPY")
    usd_jpy = fx["rates"]["JPY"]

    def yen_per_gram(usd_per_oz: float) -> float:
        return usd_per_oz / TROY_OZ_GRAMS * usd_jpy

    silver_exact = yen_per_gram(silver["price"])
    gold_exact = yen_per_gram(gold["price"])
    return {
        "silver": round(silver_exact),
        "gold": round(gold_exact),
        "silverExact": round(silver_exact, 2),
        "goldExact": round(gold_exact, 2),
        "usdJpy": usd_jpy,
        "fxDate": fx["date"],
        "goldUsdOz": gold["price"],
        "silverUsdOz": silver["price"],
        "goldUpdatedAt": gold.get("updatedAt"),
        "silverUpdatedAt": silver.get("updatedAt"),
        "source": "Gold-API USD/troy oz × Frankfurter USDJPY",
        "note": "参照価格です。販売価格は手入力レートのままです。",
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/market":
            self.serve_market()
            return
        super().do_GET()

    def serve_market(self):
        try:
            body = json.dumps(market_quote(), ensure_ascii=False).encode()
            status = 200
        except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError) as error:
            body = json.dumps({"error": str(error)}, ensure_ascii=False).encode()
            status = 502
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def main():
    os.chdir(ROOT)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Tsuii's draft  http://127.0.0.1:{PORT}/web/")
    print(f"Dashboard      http://127.0.0.1:{PORT}/web/dashboard.html")
    print("On the iPad, use this Mac's Wi-Fi address with the same port.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
