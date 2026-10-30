# zune2004.github.io

Personal site of Mohammed Zunnoon Aamir, styled as an AI model card.

- Static HTML/CSS/JS, no build step, hosted on GitHub Pages.
- **Live panel**: the visitor's browser fetches public data directly (xG pipeline CSV, GitHub API); the FPL snapshot in `data/fpl.json` is refreshed with `python scripts/update_data.py`.
- **Ask about me**: BM25 retrieval over `data/knowledge.json` decides what's in scope; optional on-device model (WebLLM, Qwen2.5-0.5B) or Chrome's built-in model only rephrases retrieved facts. No server, no API key.

Preview locally: `python -m http.server` and open http://localhost:8000.
