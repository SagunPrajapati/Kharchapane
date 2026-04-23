#!/usr/bin/env python3
"""
Broker 58 (Naasa Securities) Analysis
=======================================
Filters all Broker 58 buy/sell trades from the floorsheet JSON
and extracts meaningful insights:

  - Total buy amount, sell amount, net position
  - Per-stock accumulation/distribution
  - Top buys and sells by amount
  - Stocks where B58 is dominant (high market %)
  - Cross-broker analysis (who is B58 buying from / selling to)

Usage:
    python broker58_analysis.py                          # today
    python broker58_analysis.py --date 2026-04-23
    python broker58_analysis.py --input output/floorsheet_2026-04-23.json
"""

import json, os, argparse
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import defaultdict

NPT        = ZoneInfo("Asia/Kathmandu")
BROKER_ID  = "58"
OUTPUT_DIR = "output"


# ── LOAD DATA ────────────────────────────────────────────────────────────────
def load_floorsheet(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ── FILTER BROKER 58 ─────────────────────────────────────────────────────────
def filter_broker58(transactions: list) -> tuple[list, list]:
    buys  = [t for t in transactions if t["buyer_broker"]  == BROKER_ID]
    sells = [t for t in transactions if t["seller_broker"] == BROKER_ID]
    return buys, sells


# ── PER-STOCK ANALYSIS ────────────────────────────────────────────────────────
def per_stock_analysis(buys: list, sells: list, all_txns: list) -> dict:
    """For each stock B58 traded, compute buy/sell/net and market dominance."""

    # Total market turnover per stock
    mkt = defaultdict(float)
    for t in all_txns:
        mkt[t["symbol"]] += t["amount"]

    buy_map  = defaultdict(lambda: {"qty": 0, "amount": 0.0, "trades": 0, "avg_rate": 0.0, "rates": []})
    sell_map = defaultdict(lambda: {"qty": 0, "amount": 0.0, "trades": 0, "avg_rate": 0.0, "rates": []})

    for t in buys:
        s = t["symbol"]
        buy_map[s]["qty"]    += t["quantity"]
        buy_map[s]["amount"] += t["amount"]
        buy_map[s]["trades"] += 1
        buy_map[s]["rates"].append(t["rate"])

    for t in sells:
        s = t["symbol"]
        sell_map[s]["qty"]    += t["quantity"]
        sell_map[s]["amount"] += t["amount"]
        sell_map[s]["trades"] += 1
        sell_map[s]["rates"].append(t["rate"])

    all_symbols = set(list(buy_map.keys()) + list(sell_map.keys()))
    result = {}

    for sym in all_symbols:
        b = buy_map[sym]
        s = sell_map[sym]
        net_qty    = b["qty"]    - s["qty"]
        net_amount = b["amount"] - s["amount"]
        total_b58  = b["amount"] + s["amount"]
        mkt_total  = mkt.get(sym, 1)
        mkt_pct    = round(total_b58 / mkt_total * 100, 2) if mkt_total else 0

        # Average buy/sell rate
        avg_buy  = round(sum(b["rates"]) / len(b["rates"]), 2) if b["rates"] else 0
        avg_sell = round(sum(s["rates"]) / len(s["rates"]), 2) if s["rates"] else 0

        # Signal
        if net_qty > 0 and mkt_pct > 20:
            signal = "STRONG ACCUMULATION"
        elif net_qty > 0:
            signal = "Accumulation"
        elif net_qty < 0 and mkt_pct > 20:
            signal = "STRONG DISTRIBUTION"
        elif net_qty < 0:
            signal = "Distribution"
        else:
            signal = "Neutral"

        result[sym] = {
            "buy_qty":    b["qty"],
            "buy_amount": round(b["amount"], 2),
            "buy_trades": b["trades"],
            "avg_buy_rate": avg_buy,
            "sell_qty":    s["qty"],
            "sell_amount": round(s["amount"], 2),
            "sell_trades": s["trades"],
            "avg_sell_rate": avg_sell,
            "net_qty":     net_qty,
            "net_amount":  round(net_amount, 2),
            "mkt_dominance_pct": mkt_pct,
            "signal": signal,
        }

    return result


# ── COUNTERPARTY ANALYSIS ─────────────────────────────────────────────────────
def counterparty_analysis(buys: list, sells: list) -> dict:
    """Who is B58 buying from and selling to most?"""

    bought_from = defaultdict(lambda: {"trades": 0, "qty": 0, "amount": 0.0})
    sold_to     = defaultdict(lambda: {"trades": 0, "qty": 0, "amount": 0.0})

    for t in buys:
        cp = t["seller_broker"]
        bought_from[cp]["trades"] += 1
        bought_from[cp]["qty"]    += t["quantity"]
        bought_from[cp]["amount"] += t["amount"]

    for t in sells:
        cp = t["buyer_broker"]
        sold_to[cp]["trades"] += 1
        sold_to[cp]["qty"]    += t["quantity"]
        sold_to[cp]["amount"] += t["amount"]

    def clean(d):
        return dict(sorted(
            {k: {**v, "amount": round(v["amount"], 2)} for k, v in d.items()}.items(),
            key=lambda x: -x[1]["amount"]
        )[:10])

    return {
        "top_sellers_to_b58": clean(bought_from),
        "top_buyers_from_b58": clean(sold_to),
    }


# ── SUMMARY ───────────────────────────────────────────────────────────────────
def build_summary(buys, sells, stock_analysis, market_summary) -> dict:
    total_buy_amt  = sum(t["amount"] for t in buys)
    total_sell_amt = sum(t["amount"] for t in sells)
    total_buy_qty  = sum(t["quantity"] for t in buys)
    total_sell_qty = sum(t["quantity"] for t in sells)
    net_amount     = total_buy_amt - total_sell_amt
    net_qty        = total_buy_qty - total_sell_qty

    # Market share
    mkt_total = float(market_summary.get("total_amount", 1))
    b58_share = round((total_buy_amt + total_sell_amt) / mkt_total * 100, 2) if mkt_total else 0

    # Top stocks by net buy
    top_buys = sorted(
        [(sym, v) for sym, v in stock_analysis.items() if v["net_qty"] > 0],
        key=lambda x: -x[1]["buy_amount"]
    )[:10]

    top_sells = sorted(
        [(sym, v) for sym, v in stock_analysis.items() if v["net_qty"] < 0],
        key=lambda x: -x[1]["sell_amount"]
    )[:10]

    # Strong signals
    strong_accum = [(sym, v) for sym, v in stock_analysis.items()
                    if v["signal"] == "STRONG ACCUMULATION"]
    strong_dist  = [(sym, v) for sym, v in stock_analysis.items()
                    if v["signal"] == "STRONG DISTRIBUTION"]

    stance = "NET BUYER" if net_amount > 0 else "NET SELLER"

    return {
        "stance":           stance,
        "total_buy_amount": round(total_buy_amt, 2),
        "total_sell_amount":round(total_sell_amt, 2),
        "net_amount":       round(net_amount, 2),
        "total_buy_qty":    total_buy_qty,
        "total_sell_qty":   total_sell_qty,
        "net_qty":          net_qty,
        "total_buy_trades": len(buys),
        "total_sell_trades":len(sells),
        "market_share_pct": b58_share,
        "top_buy_stocks":   [{"symbol": s, **v} for s, v in top_buys],
        "top_sell_stocks":  [{"symbol": s, **v} for s, v in top_sells],
        "strong_accumulation": [{"symbol": s, **v} for s, v in strong_accum],
        "strong_distribution": [{"symbol": s, **v} for s, v in strong_dist],
    }


# ── PRINT REPORT ──────────────────────────────────────────────────────────────
def print_report(output: dict):
    s = output["summary"]
    print(f"\n{'═'*60}")
    print(f"  🏦  BROKER 58 (NAASA SECURITIES) — {output['date']}")
    print(f"{'═'*60}")
    print(f"  Stance         : {s['stance']}")
    print(f"  Total Bought   : Rs. {s['total_buy_amount']:>15,.2f}  ({s['total_buy_trades']:,} trades)")
    print(f"  Total Sold     : Rs. {s['total_sell_amount']:>15,.2f}  ({s['total_sell_trades']:,} trades)")
    print(f"  Net Position   : Rs. {s['net_amount']:>15,.2f}")
    print(f"  Market Share   : {s['market_share_pct']}%")
    print(f"{'─'*60}")

    print(f"\n  📈  TOP BUY STOCKS:")
    for st in s["top_buy_stocks"][:5]:
        print(f"    {st['symbol']:10}  Qty: {st['buy_qty']:>8,}  Avg: {st['avg_buy_rate']:>8.2f}  "
              f"Rs.{st['buy_amount']:>12,.0f}  [{st['signal']}]")

    print(f"\n  📉  TOP SELL STOCKS:")
    for st in s["top_sell_stocks"][:5]:
        print(f"    {st['symbol']:10}  Qty: {st['sell_qty']:>8,}  Avg: {st['avg_sell_rate']:>8.2f}  "
              f"Rs.{st['sell_amount']:>12,.0f}  [{st['signal']}]")

    if s["strong_accumulation"]:
        print(f"\n  🔥  STRONG ACCUMULATION (>20% mkt dominance + net buyer):")
        for st in s["strong_accumulation"]:
            print(f"    {st['symbol']:10}  Mkt: {st['mkt_dominance_pct']}%  "
                  f"Net Qty: +{st['net_qty']:,}")

    if s["strong_distribution"]:
        print(f"\n  ⚠️   STRONG DISTRIBUTION (>20% mkt dominance + net seller):")
        for st in s["strong_distribution"]:
            print(f"    {st['symbol']:10}  Mkt: {st['mkt_dominance_pct']}%  "
                  f"Net Qty: {st['net_qty']:,}")

    cp = output["counterparty"]
    print(f"\n  🤝  TOP BROKERS B58 BOUGHT FROM:")
    for bid, v in list(cp["top_sellers_to_b58"].items())[:5]:
        print(f"    Broker {bid:>4}  Rs.{v['amount']:>12,.0f}  ({v['trades']} trades)")

    print(f"\n  🤝  TOP BROKERS B58 SOLD TO:")
    for bid, v in list(cp["top_buyers_from_b58"].items())[:5]:
        print(f"    Broker {bid:>4}  Rs.{v['amount']:>12,.0f}  ({v['trades']} trades)")

    print(f"\n{'═'*60}\n")


# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Broker 58 Floorsheet Analysis")
    parser.add_argument("--date",   "-d", default=None)
    parser.add_argument("--input",  "-i", default=None,
                        help="Path to floorsheet JSON (auto-detected if not given)")
    parser.add_argument("--output", "-o", default=OUTPUT_DIR)
    args = parser.parse_args()

    today = args.date or datetime.now(NPT).strftime("%Y-%m-%d")

    # Auto-find input file
    if args.input:
        input_path = args.input
    else:
        input_path = os.path.join(args.output, f"floorsheet_{today}.json")
        if not os.path.exists(input_path):
            print(f"  ✗  Floorsheet not found: {input_path}")
            print(f"     Run python nepsealpha_floorsheet.py --date {today} first.")
            return

    print(f"\n🔍  Broker 58 Analysis  —  {today}")
    print(f"    Input: {input_path}\n")

    data      = load_floorsheet(input_path)
    txns      = data["transactions"]
    mkt_sum   = data["market_summary"]

    buys, sells      = filter_broker58(txns)
    stock_analysis   = per_stock_analysis(buys, sells, txns)
    counterparty     = counterparty_analysis(buys, sells)
    summary          = build_summary(buys, sells, stock_analysis, mkt_sum)

    output = {
        "date":          today,
        "broker":        "58",
        "broker_name":   "Naasa Securities",
        "scraped_at":    datetime.now(NPT).isoformat(),
        "summary":       summary,
        "stock_analysis": stock_analysis,
        "counterparty":  counterparty,
        "buy_transactions":  buys,
        "sell_transactions": sells,
    }

    os.makedirs(args.output, exist_ok=True)
    out_path = os.path.join(args.output, f"broker58_{today}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print_report(output)
    print(f"✅  Saved  →  {out_path}\n")


if __name__ == "__main__":
    main()
