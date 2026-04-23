#!/usr/bin/env python3
"""
NEPSE Daily Master Report — Automated Scraper
==============================================
Source : https://sagunprajapati.github.io/share/
Data   : https://raw.githubusercontent.com/SagunPrajapati/share/main/YYYY-MM-DD.json

Usage:
    python nepse_scraper.py
    python nepse_scraper.py --date 2026-04-22
    python nepse_scraper.py --output ./data
"""

import requests
import json
import os
import sys
import argparse
from datetime import datetime
from zoneinfo import ZoneInfo

NPT      = ZoneInfo("Asia/Kathmandu")
BASE_URL = "https://raw.githubusercontent.com/SagunPrajapati/share/main/{date}.json"
OUTPUT_DIR = "output"
HEADERS  = {"User-Agent": "Mozilla/5.0 (NEPSE-Scraper/1.0)"}


def fetch_report(report_date: str) -> dict | None:
    url = BASE_URL.format(date=report_date)
    print(f"  Fetching: {url}")
    r = requests.get(url, headers=HEADERS, timeout=15)
    if r.status_code == 404:
        print(f"  No report found for {report_date} (404). Market may have been closed.")
        return None
    r.raise_for_status()
    return r.json()


def build_output(raw: dict) -> dict:
    return {
        "meta": {
            "date":       raw.get("date"),
            "headline":   raw.get("headline"),
            "source":     "sagunprajapati.github.io/share - Broker 58 Naasa Securities",
            "scraped_at": datetime.now(NPT).isoformat(),
            "disclaimer": raw.get("disclaimer"),
        },
        "market_pulse": {
            "nepse_close":   raw.get("nepseClose"),
            "nepse_change":  raw.get("nepseChg"),
            "turnover":      raw.get("turnover"),
            "shares_traded": raw.get("sharesTraded"),
            "transactions":  raw.get("transactions"),
            "adv_dec_unch":  raw.get("advDecUnch"),
            "market_cap":    raw.get("marketCap"),
            "float_cap":     raw.get("floatCap"),
            "summary_note":  raw.get("marketPulseNote"),
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
        "sub_indices":        raw.get("subIndices", []),
        "top_movers": {
            "gainers":         raw.get("topGainers", []),
            "losers":          raw.get("topLosers", []),
            "by_turnover":     raw.get("topTurnover", []),
            "by_volume":       raw.get("topVolume", []),
            "by_transactions": raw.get("topTransactions", []),
        },
        "net_accumulation":   raw.get("netAccum", []),
        "technical_analysis": raw.get("technical", []),
        "trade_plan":         raw.get("tradePlan", []),
        "key_insights":       raw.get("keyInsights", []),
        "action_plan":        raw.get("actionPlan", []),
    }


def print_summary(data: dict):
    mp  = data["market_pulse"]
    b58 = data["broker_58"]
    print(f"\n{'='*55}")
    print(f"  NEPSE Report  {data['meta']['date']}  {data['meta']['headline']}")
    print(f"  Close: {mp['nepse_close']}  Change: {mp['nepse_change']}")
    print(f"  Turnover: {mp['turnover']}  Adv/Dec: {mp['adv_dec_unch']}")
    print(f"  Broker 58: {b58['stance']}  {b58['net_position']}")
    print(f"{'='*55}\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date",   "-d", default=None)
    parser.add_argument("--output", "-o", default=OUTPUT_DIR)
    args = parser.parse_args()

    report_date = args.date or datetime.now(NPT).strftime("%Y-%m-%d")
    print(f"\nNEPSE Master Report Scraper — {report_date}")

    raw = fetch_report(report_date)
    if raw is None:
        print("  Skipping — no data available yet. Will retry at next scheduled run.")
        sys.exit(0)

    output   = build_output(raw)
    os.makedirs(args.output, exist_ok=True)
    filename = os.path.join(args.output, f"nepse_{report_date}.json")

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False, default=str)

    print(f"  Saved: {filename}  ({os.path.getsize(filename)//1024} KB)")
    print_summary(output)
    return filename


if __name__ == "__main__":
    main()
