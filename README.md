# LIBER EFMW — The Walkable Borges Library

<!-- ENUMINOUS-UNIFIED-NAV:START -->
## Repository navigation

**eNuminous network:** [All public repositories](https://github.com/enuminous/EFMW/blob/main/REPOSITORY_NAVIGATION.md) · [EFMW](https://github.com/enuminous/EFMW) · [102 equations](https://github.com/enuminous/Monolithic_102_EFMW) · [Frozen Lean](https://github.com/enuminous/Monolithic-102-Zoo-Lean4) · [Zoo](https://github.com/enuminous/Tortoise) · [Papers](https://github.com/enuminous/papers) · [Quantum geometry](https://github.com/enuminous/Base888-Quantum-Geometry)

**This project:** [Repository home](https://github.com/enuminous/Borges-Library-CollapseOmega) · [Subject index](https://github.com/enuminous/EFMW/blob/main/REPOSITORY_NAVIGATION.md#simulators-computation-and-experiments) · [Published site](https://enuminous.github.io/Borges-Library-CollapseOmega/) · [Web application](index.html)

<details open>
<summary><strong>On this page</strong></summary>

- [Run it](#run-it)
- [What the prototype does](#what-the-prototype-does)
- [Collapse Ω: symbolic equation and executable approximation](#collapse-ω-symbolic-equation-and-executable-approximation)
- [Design constraints](#design-constraints)
- [Controls](#controls)
- [Files](#files)
- [License](#license)


</details>

**Related repositories:** [Avenue5](https://github.com/enuminous/Avenue5) · [meta-meme](https://github.com/enuminous/meta-meme) · [Verbinski-Protocol](https://github.com/enuminous/Verbinski-Protocol) · [DePIN](https://github.com/enuminous/DePIN) · [EFMW](https://github.com/enuminous/EFMW) · [papers](https://github.com/enuminous/papers)

> **Evidence boundary:** A link between projects is navigation, not an assertion of proven equivalence, experimental validation, or shared authorship. See each repository’s own status and review notes.
<!-- ENUMINOUS-UNIFIED-NAV:END -->


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

## Sophia's Public Catalogue

**Live all-repository index:** [Sophia's Universal Catalogue](catalog/index.html) · [all documents in papers](catalog/auto/papers.md) · [all public repository files](catalog/auto/overview.md). Daily GitHub Actions scans every publicly discoverable `enuminous` repository, recording source blobs and labelling documents, datasets/results, and reproducibility sources. **Metadata indexing is not scientific validation. Private repositories and connected cloud files are excluded.**


Sophia the Librarian *(the Library's fictional archival curator)* has a real, public accession ledger: [**Sophia's Catalogue**](catalog/README.md), with a machine-readable [register](catalog/sophia.json). The archived work is preserved exactly as published; its philosophical/satirical classification and review status are in a separate record.

**New accession:** [**Those Goddamn Cliffords** — MESD Dispatch 18](catalog/SOPHIA-MATH-III-2026-11-18-018.md), filed under **Mathematics, Third Gallery**, with the profanity cross-filed under **Philosophy, beside Schopenhauer**. [Read the mirrored volume](catalog/volumes/18-those-goddamn-cliffords-2026-11-18.md) or the [source MESD edition](https://github.com/enuminous/Mathematics-and-Elite-Squad-Dynamics/blob/main/articles/18-those-goddamn-cliffords-2026-11-18.md). The linked mathematical claims have their bounded source audits; universal cosmic rotation remains unverified.

**Important distinction:** The browser's sample books are generated interpretive texts and saved reader journeys are local-only. The `catalog/` files are separate, permanently published Git records; this does not change the simulator's local storage, scoring, or original literary text.

## What the prototype does

- Treats a real or imagined title as the entrance to a possible book-world.
- Uses the reader's prompt, focus, current room, and path to select a room from a bounded set.
- Creates new, short interpretive prose. Existing books are treated as subjects for interpretation; the app does not include or reproduce source text.
- Offers three actions per room: pass through a door, read a margin, or ask the Librarian. Each choice feeds back into the next collapse.
- Opens with four original sample pages generated by the same engine; choose one to enter its book-room.
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
- **Sample pages**: choose a page on the opening screen to start that book-room with its title, question, and reading lens.
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
