# Game review correction

Replaced the fixed 350 ms adjacent-position comparison with a full-strength, same-root candidate comparison. The selected time budget is used for both the unrestricted engine choice and the actual move (UCI searchmoves), with the original starting FEN and legal move history. Consequential, shallow, or inconsistent comparisons are searched again with a larger equal budget. A missing score, illegal candidate, or mismatched score/PV is rejected; an incomplete engine finish retries the pair once before reporting a partial error.

Mate outcomes are compared separately from pawn values. Preserving the same forced mate incurs no loss just for taking longer. Mate distances shown after a move account for the move just played. Checkmating moves receive no penalty. Repetition at the final position uses replayed game history. Uncertain comparisons (depth below 12, except mating results, or a restricted move evaluating materially better than the unrestricted choice) are not graded or used for practice. Depth is a heuristic, not a guarantee.

The original training agreement estimate remains mean(100 × exp(-loss / 3)), using graded moves only and scores capped at ±10 pawns. It is explicitly distinguished from Chess.com accuracy. Partial reviews do not display final percentages or create complete-game weekly statistics. Great and Brilliant are not inferred from sacrifices.

The interface presents one selected move, its player, grade, search depth, before/after evaluations, and factual feedback. Both engine and played continuations can be replayed legally without changing the PGN. The game board is read-only during review. Real fullmove numbering is retained for custom starting FENs. Stop cancels the worker immediately and preserves partial rows. Compact findings are saved for training; duplicate evaluation trees are not persisted.

Validation: automated engine/parser, perspective, candidate budgets, mate preservation, mate distance, terminal checkmate, repetition, custom FEN, cancellation, retry, and uncertain-statistics regressions. Browser QA runs the real bundled Stockfish worker on Fool’s Mate: g4 allows mate and Qh4# is Best. Verified variation replay to checkmate, original move preservation, stop/restart, desktop, and 320/390 px mobile layout.

Stockfish references consulted:
- https://official-stockfish.github.io/docs/stockfish-wiki/Developers.html
- https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html
