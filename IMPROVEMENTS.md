# Improvements Roadmap

1) Deterministic render planning
- Move canvas draw logic into a pure render plan builder.
- Unit-test render plan output (positions, edges, selected styles).

2) Incremental rendering
- Cache static background (edges + unselected nodes).
- Redraw only selection overlay when only selection changes.

3) State machines for editor + tab lifecycle
- Replace ad-hoc booleans with explicit state transitions.
- Prevent re-entrant create/close and editor open/close races.

4) Worker-based layout
- Offload layout computation to a Web Worker for large maps.

5) Regional redraw
- Track dirty bounds and only repaint changed regions.

6) Unified UI error channel
- Centralized toast or banner for non-blocking errors.

7) Persist per-tab view state
- Save offset/zoom/selection per tab for fast resume.
