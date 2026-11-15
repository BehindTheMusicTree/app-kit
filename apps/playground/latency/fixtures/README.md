# Reference tree fixture

`reference-tree.json` is a static snapshot of the public reference genre-tree payload
captured on 2026-11-15 (1,744 rows). It retains only playlist/genre identifiers,
labels, hierarchy, side/Wikidata metadata, catalogue counts, visibility flags and
creation/update timestamps required by the production reference-playlist schema.
It contains no authentication, account, playback or user-library data.

The app-kit playground receives the full snapshot. The standalone renderer receives
the accepted-root/subtree and non-null-criteria projection used by app-kit's wheel
view (1,720 rendered dots). Both use the production schema and `toTreeNodes`;
the diagnostic Vite transform records that function's actual result. The final audit
requires matching input hashes and geometry. Updating the snapshot requires checking
those invariants and the documented dot count again.
