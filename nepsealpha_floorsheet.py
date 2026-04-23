#!/usr/bin/env python3
"""
NepseAlpha Floorsheet Scraper
==============================
Scrapes all floorsheet transactions from:
  https://nepsealpha.com/floorsheet-live-today

Uses requests with browser-like headers - no browser needed.

Output:
  output/floorsheet_YYYY-MM-DD.json
  output/floorsheet_YYYY-MM-DD.csv
"""

import json, csv, os, time, argparse, requests
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import defaultdict

NPT        = ZoneInfo("Asia/Kathmandu")
BASE_URL   = "https://nepsealpha.com/floorsheet-live-today/filter"
PAGE_URL   = "https://nepsealpha.com/floorsheet-live-today"
ITEMS_PAGE = 500
DELAY      = 0.4
OUTPUT_DIR = "output"

HEADERS = {
    "User-Agent":       "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36",
    "Accept":           "application/json, text/plain, */*",
    "Accept-Language":  "en-US,en;q=0.9",
    "Referer":          "https://nepsealpha.com/floorsheet-live-today",
    "X-Requested-With": "XMLHttpRequest",
    "Connection":       "keep-alive",
}

def fetch_all(symbol=None):
    session = requests.Session()
    print("  Getting session cookies...")
    session.get(PAGE_URL, headers={**HEADERS, "Accept": "text/html"}, timeout=20)
    time.sleep(1)

    all_rows, summary, as_of, last_pg = [], {}, "", 1
    page = 1

    while True:
        params = {"itemsPerPage": ITEMS_PAGE, "page": page}
        if symbol:
            params["symbol"] = symbol.upper()

        print(f"  Fetching page {page}/{last_pg}...", end="\r")
        r = session.get(BASE_URL, params=params, headers=HEADERS, timeout=30)

        if r.status_code != 200:
            print(f"\n  Status {r.status_code} on page {page}, stopping.")
            break

        try:
            data = r.json()
        except Exception as e:
            print(f"\n  Non-JSON response on page {page}: {e}, stopping.")
            break

        if page == 1:
            summary = data.get("summary", {})
            as_of   = data.get("asOf", "")
            last_pg = int(data["data"].get("last_page") or 1)
            total   = data["data"].get("total", "?")
            print(f"\n  Total rows: {total}  |  Pages: {last_pg}  |  As of: {as_of}")

        rows = data["data"].get("data", [])
        if not rows:
            break

        all_rows.extend(rows)
        if page >= last_pg:
            break

        page += 1
        time.sleep(DELAY)

    print(f"\n  Fetched {len(all_rows):,} rows total")
    return all_rows, summary, as_of

def normalize(row):
    return {
        "contract_no":   row.get("cn", ""),
        "symbol":        row.get("smb", ""),
        "buyer_broker":  str(row.get("bb", "")),
        "seller_broker": str(row.get("sb", "")),
        "quantity":      int(float(row.get("qnt", 0))),
        "rate":          float(row.get("rt", 0)),
        "amount":        float(row.get("am", 0)),
    }

def symbol_summary(rows):
    stats = defaultdict(lambda: {"transactions":0,"total_quantity":0,"total_amount":0.0,
                                  "min_rate":float("inf"),"max_rate":0.0,
                                  "unique_buyers":set(),"unique_sellers":set()})
    for r in rows:
        s = r["symbol"]
        stats[s]["transactions"]   += 1
        stats[s]["total_quantity"] += r["quantity"]
        stats[s]["total_amount"]   += r["amount"]
        stats[s]["min_rate"]        = min(stats[s]["min_rate"], r["rate"])
        stats[s]["max_rate"]        = max(stats[s]["max_rate"], r["rate"])
        stats[s]["unique_buyers"].add(r["buyer_broker"])
        stats[s]["unique_sellers"].add(r["seller_broker"])
    result = {}
    for sym, v in sorted(stats.items(), key=lambda x: -x[1]["total_amount"]):
        result[sym] = {
            "transactions":   v["transactions"],
            "total_quantity": v["total_quantity"],
            "total_amount":   round(v["total_amount"], 2),
            "min_rate":       v["min_rate"] if v["min_rate"] != float("inf") else 0,
            "max_rate":       v["max_rate"],
            "unique_buyers":  len(v["unique_buyers"]),
            "unique_sellers": len(v["unique_sellers"]),
        }
    return result

def broker_summary(rows):
    buy  = defaultdict(lambda: {"transactions":0,"quantity":0,"amount":0.0})
    sell = defaultdict(lambda: {"transactions":0,"quantity":0,"amount":0.0})
    for r in rows:
        buy[r["buyer_broker"]]["transactions"]  += 1
        buy[r["buyer_broker"]]["quantity"]      += r["quantity"]
        buy[r["buyer_broker"]]["amount"]        += r["amount"]
        sell[r["seller_broker"]]["transactions"]+= 1
        sell[r["seller_broker"]]["quantity"]    += r["quantity"]
        sell[r["seller_broker"]]["amount"]      += r["amount"]
    result = {}
    for b in sorted(set(list(buy)+list(sell))):
        bd = buy.get(b,  {"transactions":0,"quantity":0,"amount":0.0})
        sd = sell.get(b, {"transactions":0,"quantity":0,"amount":0.0})
        result[str(b)] = {
            "buy_amount":  round(bd["amount"], 2),
            "sell_amount": round(sd["amount"], 2),
            "net_amount":  round(bd["amount"] - sd["amount"], 2),
        }
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date",   "-d", default=None)
    parser.add_argument("--symbol", "-s", default=None)
    parser.add_argument("--output", "-o", default=OUTPUT_DIR)
    parser.add_argument("--no-csv", action="store_true")
    args = parser.parse_args()

    today      = args.date or datetime.now(NPT).strftime("%Y-%m-%d")
    sym_suffix = f"_{args.symbol.upper()}" if args.symbol else ""

    print(f"NepseAlpha Floorsheet Scraper — {today}")

    rows_raw, summary, as_of = fetch_all(args.symbol)
    rows = [normalize(r) for r in rows_raw]

    output = {
        "date":       today,
        "as_of":      as_of,
        "scraped_at": datetime.now(NPT).isoformat(),
        "source":     "nepsealpha.com/floorsheet-live-today",
        "market_summary": {
            "total_transactions": int(summary.get("total", len(rows))),
            "total_quantity":     int(float(summary.get("totalquantity", 0))),
            "total_amount":       summary.get("totalamount", "0"),
        },
        "symbol_summary": symbol_summary(rows),
        "broker_summary": broker_summary(rows),
        "transactions":   rows,
    }

    os.makedirs(args.output, exist_ok=True)
    base = os.path.join(args.output, f"floorsheet_{today}{sym_suffix}")
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"Saved JSON: {base}.json  ({os.path.getsize(base+'.json')//1024} KB)")

    if not args.no_csv and rows:
        with open(base + ".csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=rows[0].keys())
            w.writeheader(); w.writerows(rows)
        print(f"Saved CSV: {base}.csv")

if __name__ == "__main__":
    main()
