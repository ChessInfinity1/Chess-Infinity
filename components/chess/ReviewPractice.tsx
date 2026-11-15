"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Flag, Lightbulb, LoaderCircle, RotateCcw, ShieldCheck, Swords, Undo2 } from "lucide-react";
import Board from "./Board";
import { Engine } from "../../lib/chess/engine";
import { botById, botReply, trainingBots } from "../../lib/chess/bots";
import { ReviewPracticeSession, type ReviewPracticeSeed } from "../../lib/chess/review-practice";

export default function ReviewPractice({ seed, theme, onClose }: { seed: ReviewPracticeSeed; theme: string; onClose: () => void }) {
  const [session] = useState(() => new ReviewPracticeSession(seed));
  const [revision, setRevision] = useState(0);
  const [botId, setBotId] = useState("luna");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(false);
  const engine = useRef<Engine | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const generation = useRef(0);
  const bot = botById(botId), board = session.board(), line = session.line;
  const isYourTurn = board.turn() === seed.player;
  const done = board.isGameOver();
  const branchMoves = board.history({ verbose: true }).slice(seed.prefixPlies);
  const first = branchMoves[0];
  function cancel() { generation.current++; session.cancel(); engine.current?.destroy(); engine.current = null; setThinking(false); }
  function restart() { cancel(); session.restart(); setError(""); setHint(false); setRevision(value => value + 1); }
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }, []);
  useEffect(() => () => { generation.current++; session.cancel(); engine.current?.destroy(); }, [session]);
  useEffect(() => {
    const position = session.board();
    if (position.isGameOver() || position.turn() === seed.player) return;
    const token = ++generation.current;
    let settled = false;
    setThinking(true); setError("");
    void session.reply(async game => {
      const moves = game.history({ verbose: true });
      const context = { startFen: moves[0]?.before || game.fen(), moves: moves.map(move => move.from + move.to + (move.promotion || "")) };
      return botReply(game.fen(), bot, (fen, ms, skill, count) => {
        if (!engine.current || engine.current.dead) engine.current = new Engine();
        return engine.current.analyze(fen, ms, skill, count, context);
      });
    }).then(applied => {
      settled = true;
      if (token === generation.current && applied) setRevision(value => value + 1);
    }).catch(reason => {
      settled = true;
      if (token === generation.current) setError((reason as Error).message || "The bot could not reply. Try again.");
    }).finally(() => { if (token === generation.current) setThinking(false); });
    return () => {
      if (!settled) { generation.current++; session.cancel(); engine.current?.destroy(); engine.current = null; }
    };
  }, [session, seed.player, revision, botId]);
  function play(from: string, to: string, promotion?: string) {
    if (thinking) return;
    try { session.play(from, to, promotion); setError(""); setRevision(value => value + 1); }
    catch { setError("Choose a legal move when it’s your turn."); }
  }
  const status = board.isCheckmate() ? (board.turn() !== seed.player ? "Checkmate. You found a winning finish!" : `${bot.name} delivered checkmate. Try a different plan.`)
    : board.isStalemate() ? "Draw by stalemate. Try a different continuation."
    : board.isThreefoldRepetition() ? "Draw by repetition."
    : board.isDraw() ? "This practice position is drawn."
    : thinking ? `${bot.name} is thinking…` : isYourTurn ? `Your move · ${seed.player === "w" ? "White" : "Black"}${board.inCheck() ? " is in check" : ""}` : `${bot.name} to move`;
  return <section className="review-practice" aria-label="Play from review position">
    <button className="text-btn practice-return" onClick={() => {cancel(); onClose();}}><ArrowLeft size={17}/> Return to game review</button>
    <header className="review-practice-heading"><div><span className="eyebrow">A SECOND CHANCE AT THE POSITION</span><h1 ref={heading} tabIndex={-1}>Play a different story.</h1><p>Before {seed.moveNumber}{seed.player === "w" ? "." : "…"} {seed.originalSan} · You play {seed.player === "w" ? "White" : "Black"}</p></div><span className="practice-safe-badge"><ShieldCheck size={16}/> Original game preserved</span></header>
    <div className="review-practice-layout">
      <section className="review-practice-board"><div className="practice-player-row"><span className="practice-player-icon"><Swords size={19}/></span><div><strong>{bot.name}</strong><small>{seed.player === "w" ? "Black" : "White"} · {bot.tagline}</small></div>{thinking && <LoaderCircle className="review-spinner" size={18}/>}</div><Board fen={board.fen()} onMove={play} flipped={seed.player === "b"} disabled={done || thinking || !isYourTurn} theme={theme}/><div className="practice-player-row"><span className="practice-player-icon you">{seed.player === "w" ? "♙" : "♟"}</span><div><strong>You · {seed.player === "w" ? "White" : "Black"}</strong><small>No clock. Think through your plan.</small></div></div><div className={"practice-live-status " + (done ? "finished" : "")} role="status">{done ? <Flag size={17}/> : thinking ? <LoaderCircle className="review-spinner" size={17}/> : <span className="fresh-dot"/>}{status}</div><div className="practice-board-actions"><button className="secondary" disabled={!line.length} onClick={() => {cancel(); session.takeBack(); setError(""); setRevision(value => value + 1);}}><Undo2 size={16}/> Take back turn</button><button className="secondary" onClick={restart}><RotateCcw size={16}/> Restart position</button></div></section>
      <aside className="card review-practice-coach"><span className="practice-coach-emblem"><Swords size={23}/></span><span className="eyebrow">FROM REVIEW TO REAL PRACTICE</span><h2>Find a plan. Play it out.</h2><p>Try your idea against a bot from the position before the reviewed move. You’re free to explore beyond the engine’s line.</p><div className="practice-original-move"><span>In the original game</span><strong>{seed.moveNumber}{seed.player === "w" ? "." : "…"} {seed.originalSan}</strong><small>What would you try this time?</small></div><label className="practice-bot-label">Practice opponent<select aria-label="Practice opponent" value={botId} disabled={!!line.length} onChange={event => {cancel(); setBotId(event.target.value); setError("");}}>{trainingBots.filter(item => item.id !== "custom").map(item => <option key={item.id} value={item.id}>{item.name} · {item.tier}</option>)}</select></label><p className="practice-bot-description">{bot.description}{!!line.length && " Restart the position to change your opponent."}</p>
        {first && <div className="practice-first-idea" role="status"><Check size={17}/><p>{line[0] === seed.bestUci ? `You tried ${first.san}, the engine’s reviewed choice. See how the plan continues.` : line[0] === seed.originalUci ? `You replayed ${first.san}. Explore the reply, or restart to try a different idea.` : `You chose ${first.san} instead of ${seed.originalSan}. Play on to see how your plan holds up.`}</p></div>}
        {seed.bestSan && <div className="practice-hint"><button className="text-btn" aria-expanded={hint} onClick={() => setHint(value => !value)}><Lightbulb size={17}/>{hint ? "Hide review hint" : "Need an idea?"}</button>{hint && <p>The review suggested <strong>{seed.bestSan}</strong>. Try it from the starting position, then compare the bot’s replies.</p>}</div>}
        {error && <div className="practice-reply-error" role="alert"><p>{error}</p>{!isYourTurn && !done && !thinking && <button className="secondary" onClick={() => setRevision(value => value + 1)}>Retry bot reply <RotateCcw size={15}/></button>}</div>}
        {!!branchMoves.length && <section className="practice-branch-moves" aria-label="Practice continuation"><h3>Your new continuation</h3><ol>{branchMoves.map((move, index) => <li key={index}><span>{+move.before.split(" ")[5]}{move.color === "w" ? "." : "…"}</span><strong>{move.san}</strong><small>{move.color === seed.player ? "You" : bot.name}</small></li>)}</ol></section>}
        <button className="primary full practice-back-cta" onClick={() => {cancel(); onClose();}}>Back to my review <ArrowRight size={17}/></button><p className="practice-footnote">This is a separate practice attempt. It does not change your imported game, review grades, or rating.</p>
      </aside>
    </div>
  </section>;
}
