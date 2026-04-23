#!/usr/bin/env python3
"""
NepseAlpha Floorsheet Scraper
==============================
Scrapes all floorsheet transactions from:
  https://nepsealpha.com/floorsheet-live-today

Uses Playwright (real browser) to bypass Cloudflare, then calls the
internal API for all paginated data.

Install once:
  pip install playwright requests
  playwright install chromium

Output:
  output/floorsheet_YYYY-MM-DD.json
  output/floorsheet_YYYY-MM-DD.csv

Usage:
  python nepsealpha_floorsheet.py               # today, all symbols
  python nepsealpha_floorsheet.py --symbol NABIL
  python nepsealpha_floorsheet.py --no-csv
  python nepsealpha_floorsheet.py --date 2026-04-22
"""

import json, csv, os, time, argparse
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import defaultdict

NPT        = ZoneInfo("Asia/Kathmandu")
PAGE_URL   = "https://nepsealpha.com/floorsheet-live-today"
API_PATH   = "/floorsheet-live-today/filter"
ITEMS_PAGE = 500
DELAY      = 0.25
OUTPUT_DIR = "output"


# ── FETCH ALL PAGES via Playwright ──────────────────────────────────────────
def fetch_all_playwright(symbol: str = None):
    from playwright.sync_api import sync_playwright

    all_rows = []
    summary  = {}
    as_of    = ""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/124.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # Visit the page first to get valid Cloudflare cookies
        print("  🌐  Opening nepsealpha.com/floorsheet-live-today ...")
        page.goto(PAGE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(2)

        def call_api(pg: int) -> dict:
            params = f"itemsPerPage={ITEMS_PAGE}&page={pg}"
            if symbol:
                params += f"&symbol={symbol.upper()}"
            resp = page.evaluate(f"""
                async () => {{
                    const r = await fetch('{API_PATH}?{params}', {{
                        headers: {{
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        }}
                    }});
                    return r.json();
                }}
            """)
            return resp

        # ── Page 1 ────────────────────────────────────────────────────────
        print("  📥  Fetching page 1 ...")
        first     = call_api(1)
        data_obj  = first["data"]
        summary   = first.get("summary", {})
        as_of     = first.get("asOf", "")
        last_page = int(data_obj.get("last_page") or 1)
        total     = data_obj.get("total", "?")

        all_rows.extend(data_obj["data"])
        print(f"      Total rows : {total}  |  Pages : {last_page}  |  As of : {as_of}")

        # ── Remaining pages ───────────────────────────────────────────────
        for pg in range(2, last_page + 1):
            print(f"  📥  Fetching page {pg}/{last_page} ...", end="\r")
            time.sleep(DELAY)
            resp = call_api(pg)
            all_rows.extend(resp["data"]["data"])

        print(f"\n  ✅  Fetched {len(all_rows):,} rows")
        browser.close()

    return all_rows, summary, as_of


# ── NORMALIZE ────────────────────────────────────────────────────────────────
def normalize(row: dict) -> dict:
    return {
        "contract_no":  row.get("cn", ""),
        "symbol":       row.get("smb", ""),
        "buyer_broker": str(row.get("bb", "")),
        "seller_broker":str(row.get("sb", "")),
        "quantity":     int(float(row.get("qnt", 0))),
        "rate":         float(row.get("rt", 0)),
        "amount":       float(row.get("am", 0)),
    }


# ── SYMBOL SUMMARY ───────────────────────────────────────────────────────────
def symbol_summary(rows):
    stats = defaultdict(lambda: {
        "transactions": 0, "total_quantity": 0, "total_amount": 0.0,
        "min_rate": float("inf"), "max_rate": 0.0,
        "unique_buyers": set(), "unique_sellers": set()
    })
    for r in rows:
        s = r["symbol"]
        stats[s]["transactions"]    += 1
        stats[s]["total_quantity"]  += r["quantity"]
        stats[s]["total_amount"]    += r["amount"]
        stats[s]["min_rate"]         = min(stats[s]["min_rate"], r["rate"])
        stats[s]["max_rate"]         = max(stats[s]["max_rate"], r["rate"])
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


# ── BROKER SUMMARY ───────────────────────────────────────────────────────────
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
            "buy_transactions":  bd["transactions"],
            "buy_quantity":      bd["quantity"],
            "buy_amount":        round(bd["amount"], 2),
            "sell_transactions": sd["transactions"],
            "sell_quantity":     sd["quantity"],
            "sell_amount":       round(sd["amount"], 2),
            "net_amount":        round(bd["amount"] - sd["amount"], 2),
        }
    return result


# ── SAVE ─────────────────────────────────────────────────────────────────────
def save_json(data, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  💾  JSON → {path}  ({os.path.getsize(path)//1024} KB)")

def save_csv(rows, path):
    if not rows: return
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys())
        w.writeheader(); w.writerows(rows)
    print(f"  💾  CSV  → {path}  ({os.path.getsize(path)//1024} KB)")


# ── PRINT SUMMARY ─────────────────────────────────────────────────────────────
def print_summary(output):
    m = output["market_summary"]
    print(f"\n{'═'*58}")
    print(f"  📊  NepseAlpha Floorsheet  —  {output['date']}")
    print(f"{'═'*58}")
    print(f"  As of          : {output['as_of']}")
    print(f"  Total Trades   : {m['total_transactions']:,}")
    print(f"  Total Quantity : {m['total_quantity']:,}")
    print(f"  Total Amount   : Rs. {float(m['total_amount']):,.2f}")
    print(f"{'─'*58}")
    print("  Top 5 Stocks by Turnover:")
    for sym, v in list(output["symbol_summary"].items())[:5]:
        print(f"    {sym:10}  Rs.{v['total_amount']:>15,.0f}   ({v['transactions']:,} trades)")
    print(f"{'─'*58}")
    top_brokers = sorted(
        output["broker_summary"].items(), key=lambda x: -abs(x[1]["net_amount"])
    )[:5]
    print("  Top 5 Brokers by Net Position:")
    for bid, v in top_brokers:
        sign = "+" if v["net_amount"] >= 0 else ""
        print(f"    Broker {bid:>4}   Net: {sign}Rs.{v['net_amount']:>14,.0f}")
    print(f"{'═'*58}\n")


# ── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="NepseAlpha Floorsheet Scraper")
    parser.add_argument("--date",    "-d", default=None,
                        help="Date label YYYY-MM-DD (default: today NPT)")
    parser.add_argument("--symbol",  "-s", default=None,
                        help="Filter by stock symbol e.g. NABIL")
    parser.add_argument("--output",  "-o", default=OUTPUT_DIR)
    parser.add_argument("--no-csv",  action="store_true")
    args = parser.parse_args()

    today      = args.date or datetime.now(NPT).strftime("%Y-%m-%d")
    sym_suffix = f"_{args.symbol.upper()}" if args.symbol else ""

    print(f"\n🚀  NepseAlpha Floorsheet Scraper")
    print(f"    Date   : {today}")
    print(f"    Symbol : {args.symbol or 'ALL'}\n")

    rows_raw, summary, as_of = fetch_all_playwright(args.symbol)
    rows = [normalize(r) for r in rows_raw]

    output = {
        "date":       today,
        "as_of":      as_of,
        "scraped_at": datetime.now(NPT).isoformat(),
        "source":     "nepsealpha.com/floorsheet-live-today",
        "filter":     {"symbol": args.symbol},
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
    save_json(output, base + ".json")
    if not args.no_csv:
        save_csv(rows, base + ".csv")

    print_summary(output)

if __name__ == "__main__":
    main()
