# LIBER EFMW — The Walkable Borges Library

A browser-based, first-person literary simulator. Give the Library a title and a question; it resolves one bounded book-room, writes an original interpretive passage, and lets your choices recursively change the next room.

> **The Library is infinite, but the reader is the aperture.**

## Run it

The app is static and has no build step or API dependency. Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

For a one-file version that can be opened without keeping the project folder together, open `standalone.html`. Rebuild it after changing the source files with:

```bash
python3 scripts/build_standalone.py
```

Run the dependency-free engine checks with Node.js:

```bash
node --test tests/engine.test.cjs
```

To publish it with GitHub Pages:

1. Put the project files in the root of a GitHub repository.
2. In **Settings → Pages**, set the publishing source to **GitHub Actions**.
3. Push to the repository's `main` branch. `.github/workflows/pages.yml` uploads the static files and deploys them.

## What the prototype does

- Treats a real or imagined title as the entrance to a possible book-world.
- Uses the reader's prompt, focus, current room, and path to select a room from a bounded set.
- Creates new, short interpretive prose. Existing books are treated as subjects for interpretation; the app does not include or reproduce source text.
- Offers three actions per room: pass through a door, read a margin, or ask the Librarian. Each choice feeds back into the next collapse.
- Draws the library aisle in a responsive canvas, with keyboard and pointer look controls.
- Offers full-screen immersion and an optional low-volume ambient tone; neither starts automatically.
- Saves the current journey in browser-local storage and can export it as JSON.
- Runs without an account, server, model API, telemetry, or external asset requests.

## Collapse Ω: symbolic equation and executable approximation

The project preserves the symbolic Borges operator:

\[
B_{\mathrm{EFMW}}(x,t,u)=\operatorname{Collapse}_{\Omega}\left[\int_{\Gamma} e^{iS[\phi,\psi,I]/\hbar} R_{23}(\phi) M_{\mathrm{text}}(\psi) O_u(t)\,d\Gamma\right]
\]

Here, the Library's saved formulation treats `x` as position in the book-room, `t` as interaction time, `u` as reader state and intention, and `Γ` as symbolic book possibility. In the browser build, these terms map to a finite interaction model:

| Symbol | Runnable interpretation |
| --- | --- |
| `x` | Current room and reading-path position |
| `t` | Step number in the current journey |
| `u` | Reader's question, focus, and choices |
| `Γ` | The finite room templates considered on each step |
| `R₂₃` | Repeat-aware coherence and continuity checks |
| `M_text` | Original prose assembled from room-specific language patterns |
| `Collapse_Ω` | Deterministic, seeded selection among the best-fitting room candidates |

The reference scorer in `engine.js` is:

```text
room* = argmax [0.34C + 0.28R + 0.20U + 0.12V − 0.16N]
```

`C` is title/room coherence, `R` is resonance with the reader prompt, `U` is heuristic usefulness, `V` is novelty relative to visited rooms, and `N` is a room's disorientation penalty. The engine picks from the leading near-ties using a seeded rule, so the same reader state gives the same route. The visible score is an internal heuristic trace, **not** a confidence estimate about a real-world fact.

This is a practical literary implementation of the symbolic operator. It does not evaluate a quantum or physical path integral, and it does not establish EFMW as a physical theory. The method is intentionally inspectable and bounded so the user can see what the program selected and why.

## Design constraints

- Keep imagined editions clearly framed as interpretive simulations.
- Do not pass off generated prose as a source passage or canonical book text.
- Preserve unresolved fragments and interruptions; do not force every room toward a completed story.
- Keep the session on the reader's device. No input is sent to an external service.

## Controls

- **Enter**: submit a title when the title field is focused.
- **1 / 2 / 3**: choose one of the current room's three doors.
- **← / →** or drag on the scene: look around.
- **Immersion**: expand the whole reading room to full-screen; press **Esc** to return.
- **Close & Shelve**: end the active book-room and keep the saved reading record in the browser.

## Files

- `index.html` — application structure and operator note.
- `styles.css` — responsive dark reading-room interface.
- `engine.js` — finite Collapse Ω reference rule and room text primitives.
- `app.js` — canvas rendering, reader controls, local persistence, and export.
- `standalone.html` — self-contained browser version for direct opening.
- `scripts/build_standalone.py` — reproducible single-file packager.
- `.github/workflows/pages.yml` — static GitHub Pages deployment.

## License

No license has been assigned. Copyright remains with the project author unless a later repository license says otherwise.
