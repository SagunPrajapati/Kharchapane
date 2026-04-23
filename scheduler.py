#!/usr/bin/env python3
"""
NEPSE Daily Scheduler
======================
Runs both scrapers automatically every trading day at 3:05 PM NPT:
  1. nepse_scraper.py          — sagunprajapati daily master report
  2. nepsealpha_floorsheet.py  — full floorsheet from nepsealpha.com

Usage:
  python scheduler.py               # runs forever, fires at 3:05 PM NPT
  python scheduler.py --run-now     # immediate run (for testing)
  python scheduler.py --time 15:10  # custom run time HH:MM NPT
  python scheduler.py --floorsheet-only
  python scheduler.py --report-only
"""

import subprocess, sys, time, argparse
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

NPT          = ZoneInfo("Asia/Kathmandu")
DEFAULT_TIME = "15:05"

def seconds_until(hhmm: str) -> float:
    h, m  = map(int, hhmm.split(":"))
    now   = datetime.now(NPT)
    nxt   = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if nxt <= now:
        nxt += timedelta(days=1)
    return (nxt - now).total_seconds()

def run(script: str, label: str):
    ts = datetime.now(NPT).strftime("%H:%M:%S %Z")
    print(f"\n[{ts}] 🚀  Running {label} ...")
    result = subprocess.run([sys.executable, script])
    if result.returncode == 0:
        print(f"[{ts}] ✅  {label} — Done")
    else:
        print(f"[{ts}] ❌  {label} — Failed (exit {result.returncode})")

def main():
    parser = argparse.ArgumentParser(description="NEPSE daily scheduler")
    parser.add_argument("--run-now",        action="store_true")
    parser.add_argument("--time",           default=DEFAULT_TIME)
    parser.add_argument("--floorsheet-only",action="store_true")
    parser.add_argument("--report-only",    action="store_true")
    args = parser.parse_args()

    def run_all():
        if not args.floorsheet_only:
            run("nepse_scraper.py",         "Master Report")
        if not args.report_only:
            run("nepsealpha_floorsheet.py", "Floorsheet")

    if args.run_now:
        run_all()
        return

    print(f"\n📅  NEPSE Scheduler — fires daily at {args.time} NPT")
    print("    Press Ctrl+C to stop.\n")

    while True:
        wait = seconds_until(args.time)
        nxt  = datetime.now(NPT) + timedelta(seconds=wait)
        print(f"⏰  Next run : {nxt.strftime('%Y-%m-%d %H:%M %Z')}  (in {wait/3600:.1f} h)")
        time.sleep(max(0, wait))
        run_all()
        time.sleep(61)

if __name__ == "__main__":
    main()
