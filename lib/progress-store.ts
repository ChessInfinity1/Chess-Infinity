import { eq, and } from "drizzle-orm";
import { progress } from "../db/schema.ts";
import type { getDb } from "../db/index";
type Db = ReturnType<typeof getDb>;
export class SaveConflict extends Error {
  constructor() {
    super(
      "Progress changed on another device. Export pending work and reload cloud progress.",
    );
  }
}
export async function readProgress(db: Db, userId: string) {
  const [row] = await db
    .select()
    .from(progress)
    .where(eq(progress.userId, userId));
  return {
    data: row ? JSON.parse(row.data) : null,
    version: row?.version || 0,
  };
}
export async function writeProgress(
  db: Db,
  userId: string,
  data: any,
  expected: number,
) {
  const [row] = await db
    .select()
    .from(progress)
    .where(eq(progress.userId, userId));
  if (row ? row.version !== expected : expected !== 0) throw new SaveConflict();
  const values = {
    userId,
    data: JSON.stringify(data),
    version: expected + 1,
    updatedAt: new Date().toISOString(),
  };
  if (row) {
    const changed = await db
      .update(progress)
      .set(values)
      .where(and(eq(progress.userId, userId), eq(progress.version, expected)))
      .returning();
    if (!changed.length) throw new SaveConflict();
  } else {
    try {
      await db.insert(progress).values(values);
    } catch {
      throw new SaveConflict();
    }
  }
  return { version: values.version };
}
export async function deleteProgress(db: Db, userId: string) {
  await db.delete(progress).where(eq(progress.userId, userId));
}
