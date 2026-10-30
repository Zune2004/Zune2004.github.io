"""Refresh the static snapshots the site reads (data/fpl.json) and the web copy of the resume.

Usage:  python scripts/update_data.py [path-to-football-ml-repo] [path-to-resume-folder]
Defaults: D:/zune/fpl and D:/zune/resume. Reads the FPL bot's private `bot-state` branch locally,
so nothing private is published except the summary written below.
"""
import csv
import io
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
FPL = Path(sys.argv[1] if len(sys.argv) > 1 else "D:/zune/fpl")
RESUME = Path(sys.argv[2] if len(sys.argv) > 2 else "D:/zune/resume")


def git(*args):
    return subprocess.run(["git", "-C", str(FPL), *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def fpl_snapshot():
    git("fetch", "-q", "origin", "bot-state")
    files = git("ls-tree", "--name-only", "-r", "origin/bot-state").split()
    finals = sorted((f for f in files if re.fullmatch(r"reports/GW(\d+)_final\.txt", f)),
                    key=lambda f: int(re.search(r"\d+", f).group()))
    report = git("show", f"origin/bot-state:{finals[-1]}")
    gw = int(re.search(r"=== GW(\d+)", report).group(1))
    transfers = [{"out": o.strip(), "in": i.strip()}
                 for o, i in re.findall(r"OUT (\S[^(]*?)\s+\(.*?->\s+IN (\S[^\n]*?)\s{2,}\S{3} £", report)]
    cap = re.search(r"Captain: (.+?) \([\d.]+\)\s+Vice: (.+)", report)
    exp = re.search(r"STARTING XI \(expected ([\d.]+) pts", report)
    chips = "hold all chips" if "hold all chips" in report else (re.search(r"->\s*(play [^\n]+)", report) or [None, "see report"])[1]
    acc = list(csv.DictReader(io.StringIO(git("show", "origin/bot-state:accuracy.csv"))))
    return {
        "gw": gw,
        "transfers": transfers,
        "captain": cap.group(1).strip(),
        "vice": cap.group(2).strip(),
        "expected": float(exp.group(1)),
        "chips": chips,
        "accuracy": [{"gw": int(r["GW"]), "mae": float(r["MAE"]), "spearman": float(r["spearman"]),
                      "predicted": float(r["our_xi_predicted"]), "actual": int(float(r["our_xi_actual"]))}
                     for r in acc[-4:]],
        "updated": datetime.now(timezone.utc).strftime("%d %b %Y"),
    }


def web_resume():
    """Copy of the classic resume without the phone number (the site is public)."""
    html = (RESUME / "resume.html").read_text(encoding="utf-8")
    html = re.sub(r"\s*<span>\+91[^<]*</span>", "", html)
    tmp = RESUME / "resume-web.html"
    tmp.write_text(html.replace("<!--STYLE-->", '<link rel="stylesheet" href="classic.css">'), encoding="utf-8")
    out = SITE / "assets" / "Mohammed-Zunnoon-Aamir-Resume.pdf"
    chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    subprocess.run([chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000",
                    f"--print-to-pdf={out}", tmp.resolve().as_uri()], capture_output=True, check=True)
    tmp.unlink()
    return out


if __name__ == "__main__":
    snap = fpl_snapshot()
    (SITE / "data" / "fpl.json").write_text(json.dumps(snap, indent=2, ensure_ascii=False), encoding="utf-8")
    print("fpl.json:", snap["gw"], snap["transfers"], snap["captain"], snap["expected"])
    print("resume:", web_resume())
