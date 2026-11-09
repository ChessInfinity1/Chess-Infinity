# Profile and mobile Home update

The profile is a compact, full-height mobile sheet with an avatar/name header, segmented navigation, smaller rating cards, and an explicitly labeled imported-game count. The bottom dock is hidden while the profile is open and background main content is inert.

The game library now derives directly from saved games for the linked username, rather than the latest 40 IDs. Archive merges no longer silently drop older games at 150. Refresh preserves older imports and the history cursor. Sync all walks archive pages serially, validates PGNs, merges unique IDs, reports new/total counts, and retains completed pages after a pause or error. Older-page cursors are saved. No arbitrary rating or game count is added to make a sync look successful.

Large collections remain subject to the existing serialized progress store's capacity. The client stops before its save payload limit and shows an error; it does not discard earlier pages or falsely report a complete history. A separate game-storage service would be needed for arbitrarily large archives.

Home has four large shortcuts before the next lesson: puzzles, bots, game review, and the training plan. Weekly progress, linked accounts, and the game library are expandable; report and guided-game links remain directly accessible.

Validation: TypeScript, 80 automated tests, mobile browser checks at 320/390 px and desktop sizing, real Home navigation, and isolated profile UI checks with clearly identified local test archives (40 to 200, duplicate refresh stays 200, 40 rendered game rows, close/reopen retains count). The temporary fixture route and device harness were removed. A real EliamGM public import was attempted in preview; the provider could not be reached from that environment, so a live external transfer was not verified. Existing provider request, error, and legal-PGN tests pass.
