import {
  fetchChessCom,
  parseArchiveCursor,
} from "../../../lib/chess/chesscom.ts";
import {
  normalizeChessComUsername,
  chessComUsernameHelp,
} from "../../../lib/chess/chesscom-input.ts";
export async function GET(req: Request) {
  // This endpoint returns public Chess.com data, never academy records or credentials.
  // Public-profile linking must also work in the device-local academy session.
  const name = normalizeChessComUsername(
    new URL(req.url).searchParams.get("username") || "",
  );
  if (!name)
    return Response.json({ error: chessComUsernameHelp }, { status: 400 });
  const cursor = new URL(req.url).searchParams.get("cursor") || undefined;
  try {
    parseArchiveCursor(cursor);
  } catch {
    return Response.json({ error: "Invalid archive cursor." }, { status: 400 });
  }
  try {
    return Response.json(await fetchChessCom(name, cursor), {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
