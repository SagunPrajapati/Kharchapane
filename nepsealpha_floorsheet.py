#!/usr/bin/env python3
"""
NEPSE Floorsheet Scraper — Official API
=========================================
Uses nepalstock.com official API (no Cloudflare block).
Works reliably from GitHub Actions servers.

API: https://nepalstock.com/api/nots/nepse-data/floorsheet

Output:
  output/floorsheet_YYYY-MM-DD.json
  output/floorsheet_YYYY-MM-DD.csv
"""

import json, csv, os, time, argparse, requests
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import defaultdict

NPT        = ZoneInfo("Asia/Kathmandu")
BASE_URL   = "https://nepalstock.com/api/nots/nepse-data/floorsheet"
ITEMS_PAGE = 500
DELAY      = 0.5
OUTPUT_DIR = "output"

HEADERS = {
    "User-Agent":    "Mozilla/5.0 (compatible; NEPSE-Bot/1.0)",
    "Accept":        "application/json",
    "Referer":       "https://nepalstock.com/floor-sheet",
    "Origin":        "https://nepalstock.com",
}


def fetch_all(date_str=None):
    all_rows, summary, as_of = [], {}, ""
    page, last_pg = 0, 1

    while page < last_pg:
        params = {
            "size":        ITEMS_PAGE,
            "page":        page,
            "startDate":   date_str or datetime.now(NPT).strftime("%Y-%m-%d"),
            "endDate":     date_str or datetime.now(NPT).strftime("%Y-%m-%d"),
            "businessDate": date_str or datetime.now(NPT).strftime("%Y-%m-%d"),
        }
        print(f"  Fetching page {page+1}/{last_pg}...", end="\r")
        r = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=30)

        if r.status_code != 200:
            print(f"\n  Status {r.status_code}, stopping.")
            break

        try:
            data = r.json()
        except Exception as e:
            print(f"\n  Parse error: {e}")
            break

        if page == 0:
            total    = data.get("totalCount", 0)
            last_pg  = max(1, (int(total) + ITEMS_PAGE - 1) // ITEMS_PAGE) if total else 1
            as_of    = data.get("asOf") or data.get("businessDate") or date_str or ""
            summary  = {
                "total":          int(total),
                "totalquantity":  data.get("totalTradedQuantity", 0),
                "totalamount":    data.get("totalTradedValue", 0),
            }
            print(f"\n  Total: {total} rows | Pages: {last_pg} | As of: {as_of}")

        rows = data.get("floorsheets", {}).get("content", []) or data.get("content", []) or []

        # try alternate paths
        if not rows:
            rows = data.get("data", []) or data.get("floorSheet", []) or []

        if not rows:
            print(f"\n  No rows in page {page+1}, stopping.")
            break

        all_rows.extend(rows)
        page += 1
        if page < last_pg:
            time.sleep(DELAY)

    print(f"\n  Fetched {len(all_rows):,} rows total")
    return all_rows, summary, as_of


def normalize(row):
    # Official API field names
    return {
        "contract_no":   str(row.get("contractId") or row.get("contractNo") or ""),
        "symbol":        str(row.get("stockSymbol") or row.get("symbol") or ""),
        "buyer_broker":  str(row.get("buyerMemberId") or row.get("buyerBroker") or ""),
        "seller_broker": str(row.get("sellerMemberId") or row.get("sellerBroker") or ""),
        "quantity":      int(row.get("contractQuantity") or row.get("quantity") or 0),
        "rate":          float(row.get("contractRate") or row.get("rate") or 0),
        "amount":        float(row.get("contractAmount") or row.get("amount") or 0),
    }


def symbol_summary(rows):
    stats = defaultdict(lambda: {"transactions":0,"total_quantity":0,"total_amount":0.0,
                                  "min_rate":float("inf"),"max_rate":0.0,
                                  "unique_buyers":set(),"unique_sellers":set()})
    for r in rows:
        s = r["symbol"]
        if not s: continue
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
            "buy_transactions":  bd["transactions"],
            "buy_quantity":      bd["quantity"],
            "buy_amount":        round(bd["amount"], 2),
            "sell_transactions": sd["transactions"],
            "sell_quantity":     sd["quantity"],
            "sell_amount":       round(sd["amount"], 2),
            "net_amount":        round(bd["amount"] - sd["amount"], 2),
        }
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date",   "-d", default=None)
    parser.add_argument("--output", "-o", default=OUTPUT_DIR)
    parser.add_argument("--no-csv", action="store_true")
    args = parser.parse_args()

    today = args.date or datetime.now(NPT).strftime("%Y-%m-%d")
    print(f"\nNEPSE Floorsheet Scraper (Official API) -- {today}\n")

    rows_raw, summary, as_of = fetch_all(today)

    if not rows_raw:
        print("  No data fetched. Market may be closed or date has no data.")
        # Save empty file so workflow doesnt fail
        os.makedirs(args.output, exist_ok=True)
        base = os.path.join(args.output, f"floorsheet_{today}.json")
        with open(base, "w") as f:
            json.dump({"date": today, "as_of": "", "scraped_at": datetime.now(NPT).isoformat(),
                       "source": "nepalstock.com", "market_summary": {"total_transactions":0,"total_quantity":0,"total_amount":"0"},
                       "symbol_summary":{}, "broker_summary":{}, "transactions":[]}, f, indent=2)
        print(f"  Saved empty file: {base}")
        return

    rows = [normalize(r) for r in rows_raw]

    output = {
        "date":       today,
        "as_of":      as_of,
        "scraped_at": datetime.now(NPT).isoformat(),
        "source":     "nepalstock.com (official API)",
        "market_summary": {
            "total_transactions": int(summary.get("total", len(rows))),
            "total_quantity":     int(float(summary.get("totalquantity", 0))),
            "total_amount":       str(summary.get("totalamount", "0")),
        },
        "symbol_summary": symbol_summary(rows),
        "broker_summary": broker_summary(rows),
        "transactions":   rows,
    }

    os.makedirs(args.output, exist_ok=True)
    base = os.path.join(args.output, f"floorsheet_{today}.json")

    with open(base + ".json" if not base.endswith(".json") else base, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    sz = os.path.getsize(base if base.endswith(".json") else base+".json")
    print(f"  Saved JSON: {base}  ({sz//1024} KB)")

    if not args.no_csv and rows:
        csv_path = base.replace(".json", ".csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=rows[0].keys())
            w.writeheader(); w.writerows(rows)
        print(f"  Saved CSV:  {csv_path}")

    print(f"\n  Total trades : {output['market_summary']['total_transactions']:,}")
    s58 = output["broker_summary"].get("58", {})
    if s58:
        print(f"  Broker 58    : Buy Rs.{s58['buy_amount']:,.0f} | Sell Rs.{s58['sell_amount']:,.0f} | Net Rs.{s58['net_amount']:,.0f}")


if __name__ == "__main__":
    main()
