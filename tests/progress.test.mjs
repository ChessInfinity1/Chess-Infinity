import { test } from "node:test";
import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import { drizzle } from "drizzle-orm/d1";
import {
  readProgress,
  writeProgress,
  deleteProgress,
  SaveConflict,
} from "../lib/progress-store.ts";
import { readFile } from "node:fs/promises";
import { initialProgress } from "../lib/chess/content.ts";
import { createFocusSession, completeFocusStep } from "../lib/chess/focus.ts";
import { validateProgress } from "../lib/progress-backup.ts";
test("D1 persistence, user isolation, conflicts, concurrent writes, deletion", async () => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    d1Databases: ["DB"],
    compatibilityDate: "2026-05-15",
  });
  try {
    const binding = await mf.getD1Database("DB");
    await binding
      .prepare(
        await readFile(
          new URL("../drizzle/0000_tearful_gunslinger.sql", import.meta.url),
          "utf8",
        ),
      )
      .run();
    const db = drizzle(binding);
    assert.deepEqual(await readProgress(db, "alice"), {
      data: null,
      version: 0,
    });
    await writeProgress(db, "alice", { completed: ["l1"], xp: 50 }, 0);
    assert.equal((await readProgress(db, "alice")).data.xp, 50);
    assert.equal((await readProgress(db, "bob")).data, null);
    await assert.rejects(
      writeProgress(db, "alice", { xp: 999 }, 0),
      SaveConflict,
    );
    const writes = await Promise.allSettled([
      writeProgress(db, "alice", { xp: 70 }, 1),
      writeProgress(db, "alice", { xp: 80 }, 1),
    ]);
    assert.equal(writes.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal((await readProgress(db, "alice")).version, 2);
    const revenge = {
      positions: [
        {
          id: "test-position",
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          bestUci: "e2e4",
        },
      ],
      records: {
        "test-position": {
          cleanDays: ["2026-11-07"],
          dueAt: "2026-11-08T12:00:00.000Z",
        },
      },
    };
    await writeProgress(db, "bob", { xp: 20, revenge }, 0);
    assert.deepEqual((await readProgress(db, "bob")).data.revenge, revenge);
    const focus = createFocusSession(initialProgress, 10, "persisted-focus");
    const focusSessions = completeFocusStep([focus], focus.id, focus.steps[0].id, "lesson", true);
    await writeProgress(db, "bob", validateProgress({ ...initialProgress, xp: 20, focusSessions }), 1);
    assert.deepEqual((await readProgress(db, "bob")).data.focusSessions, focusSessions);
    assert.equal((await readProgress(db, "alice")).data.focusSessions, undefined);
    await deleteProgress(db, "alice");
    assert.equal((await readProgress(db, "alice")).data, null);
    assert.equal((await readProgress(db, "bob")).data.xp, 20);
    await assert.rejects(
      writeProgress(db, "alice", { xp: 900 }, 2),
      SaveConflict,
    );
  } finally {
    await mf.dispose();
  }
});
