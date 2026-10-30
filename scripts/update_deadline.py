"""Write data/deadline.json with the next FPL deadline from the public FPL API (no key needed).
Run daily by .github/workflows/deadline.yml; keeps the old file if the API is unreachable."""
import json
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "deadline.json"
req = urllib.request.Request("https://fantasy.premierleague.com/api/bootstrap-static/", headers={"User-Agent": "Mozilla/5.0"})
try:
    events = json.load(urllib.request.urlopen(req, timeout=30))["events"]
except Exception as e:  # FPL sometimes blocks or rate-limits; the site shows the last good value
    print("FPL API unreachable, keeping old deadline:", e)
    raise SystemExit(0)
nxt = next((e for e in events if e["is_next"]), None)
cur = next((e for e in events if e["is_current"]), None)
data = {
    "next_gw": nxt and nxt["id"],
    "deadline": nxt and nxt["deadline_time"],
    "current_gw": cur and cur["id"],
    "current_avg": cur and cur.get("average_entry_score"),
    "current_top": cur and cur.get("highest_score"),
}
OUT.write_text(json.dumps(data, indent=2), encoding="utf-8")
print(data)
