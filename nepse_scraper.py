#!/usr/bin/env python3
"""
NEPSE Daily Master Report — Automated Scraper
==============================================
Source : https://sagunprajapati.github.io/share/
Data   : https://raw.githubusercontent.com/SagunPrajapati/share/main/YYYY-MM-DD.json

Fetches the daily JSON published by Sagun Prajapati (Broker 58 – Naasa Securities)
and saves a clean, structured copy to  output/nepse_YYYY-MM-DD.json

Usage:
    python nepse_scraper.py              # today's report
    python nepse_scraper.py --date 2026-04-22   # specific date
    python nepse_scraper.py --output ./data     # custom output folder
"""

import requests
import json
import os
import sys
import argparse
from datetime import datetime, date
from zoneinfo import ZoneInfo

# ── CONFIG ──────────────────────────────────────────────
NPT        = ZoneInfo("Asia/Kathmandu")
BASE_URL   = "https://raw.githubusercontent.com/SagunPrajapati/share/main/{date}.json"
OUTPUT_DIR = "output"
HEADERS    = {"User-Agent": "Mozilla/5.0 (NEPSE-Scraper/1.0)"}

# ── FETCH ───────────────────────────────────────────────
def fetch_report(report_date: str) -> dict:
    """Download the raw JSON for the given date (YYYY-MM-DD)."""
    url = BASE_URL.format(date=report_date)
    print(f"  ↓  Fetching: {url}")
    r = requests.get(url, headers=HEADERS, timeout=15)
    if r.status_code == 404:
        print(f"  ✗  No report found for {report_date} (404). Market may have been closed.")
        sys.exit(1)
    r.raise_for_status()
    return r.json()

# ── STRUCTURE ───────────────────────────────────────────
def build_output(raw: dict) -> dict:
    """Re-shape the raw JSON into a clean, well-labelled structure."""
    return {
        "meta": {
            "date":          raw.get("date"),
            "headline":      raw.get("headline"),
            "source":        "sagunprajapati.github.io/share — Broker 58 Naasa Securities",
            "scraped_at":    datetime.now(NPT).isoformat(),
            "disclaimer":    raw.get("disclaimer"),
        },
        "market_pulse": {
            "nepse_close":     raw.get("nepseClose"),
            "nepse_change":    raw.get("nepseChg"),
            "turnover":        raw.get("turnover"),
            "shares_traded":   raw.get("sharesTraded"),
            "transactions":    raw.get("transactions"),
            "adv_dec_unch":    raw.get("advDecUnch"),
            "market_cap":      raw.get("marketCap"),
            "float_cap":       raw.get("floatCap"),
            "summary_note":    raw.get("marketPulseNote"),
        },
        "broker_58": {
            "stance":          raw.get("b58Stance"),
            "net_position":    raw.get("b58Net"),
            "total_purchase":  raw.get("b58Purchase"),
            "total_sales":     raw.get("b58SalesTotal"),
            "top_buy_symbol":  raw.get("b58TopBuy"),
            "peak_market_pct": raw.get("b58PeakMkt"),
            "top_purchases":   raw.get("b58Purchases", []),
            "top_sales":       raw.get("b58SalesList", []),
        },
        "sub_indices":      raw.get("subIndices", []),
        "top_movers": {
            "gainers":        raw.get("topGainers", []),
            "losers":         raw.get("topLosers", []),
            "by_turnover":    raw.get("topTurnover", []),
            "by_volume":      raw.get("topVolume", []),
            "by_transactions":raw.get("topTransactions", []),
        },
        "net_accumulation": raw.get("netAccum", []),
        "technical_analysis": raw.get("technical", []),
        "trade_plan":       raw.get("tradePlan", []),
        "key_insights":     raw.get("keyInsights", []),
        "action_plan":      raw.get("actionPlan", []),
    }

# ── PRINT SUMMARY ───────────────────────────────────────
def print_summary(data: dict):
    mp = data["market_pulse"]
    b58 = data["broker_58"]
    print(f"\n{'═'*55}")
    print(f"  📊  NEPSE Daily Report  —  {data['meta']['date']}")
    print(f"  {data['meta']['headline']}")
    print(f"{'═'*55}")
    print(f"  NEPSE Close  : {mp['nepse_close']}  ({mp['nepse_change']})")
    print(f"  Turnover     : {mp['turnover']}")
    print(f"  Adv/Dec/Unch : {mp['adv_dec_unch']}")
    print(f"  Transactions : {mp['transactions']}")
    print(f"  Broker 58    : {b58['stance']}  {b58['net_position']}")
    print(f"{'─'*55}")

    gainers = data["top_movers"]["gainers"][:3]
    losers  = data["top_movers"]["losers"][:3]
    print(f"  Top Gainers  : " + "  |  ".join(f"{g['sym']} {g['chgPct']}" for g in gainers))
    print(f"  Top Losers   : " + "  |  ".join(f"{l['sym']} {l['chgPct']}" for l in losers))
    print(f"{'─'*55}")

    buys = [t for t in data["trade_plan"] if "BUY" in t.get("action","").upper()][:3]
    if buys:
        print(f"  Trade Signals (BUY):")
        for t in buys:
            print(f"    • {t['sym']:8}  Entry: {t.get('entry','—')}  Stop: {t.get('stop','—')}  T1: {t.get('t1','—')}")
    print(f"{'═'*55}\n")

# ── MAIN ────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="NEPSE Daily Report Scraper")
    parser.add_argument("--date",   "-d", default=None,
                        help="Report date YYYY-MM-DD (default: today NPT)")
    parser.add_argument("--output", "-o", default=OUTPUT_DIR,
                        help=f"Output directory (default: {OUTPUT_DIR})")
    args = parser.parse_args()

    report_date = args.date or datetime.now(NPT).strftime("%Y-%m-%d")

    print(f"\n🚀  NEPSE Scraper  —  {datetime.now(NPT).strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print(f"    Report date : {report_date}")

    raw    = fetch_report(report_date)
    output = build_output(raw)

    os.makedirs(args.output, exist_ok=True)
    filename = os.path.join(args.output, f"nepse_{report_date}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print_summary(output)
    print(f"✅  Saved  →  {filename}\n")
    return filename

if __name__ == "__main__":
    main()
