#!/usr/bin/env python3
"""Bundle the modular static app into standalone.html for offline opening."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html_path = ROOT / "index.html"
html = html_path.read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
engine = (ROOT / "engine.js").read_text(encoding="utf-8")
app = (ROOT / "app.js").read_text(encoding="utf-8")

html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
scripts = '  <script src="engine.js"></script>\n  <script src="app.js"></script>'
inline = f"  <script>\n{engine}\n  </script>\n  <script>\n{app}\n  </script>"
if scripts not in html:
    raise SystemExit("Could not locate source script tags in index.html")
html = html.replace(scripts, inline)
(ROOT / "standalone.html").write_text(html, encoding="utf-8")
print("Wrote standalone.html")
