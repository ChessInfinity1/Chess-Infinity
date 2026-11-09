/** Accept public usernames, @handles, and Chess.com member URLs only. */
export function normalizeChessComUsername(input: string): string | null {
  let name = input.trim();
  if (/^(?:https?:\/\/)?(?:www\.)?chess\.com\//i.test(name)) {
    try {
      const url = new URL(
        /^https?:\/\//i.test(name) ? name : `https://${name}`,
      );
      if (!["chess.com", "www.chess.com"].includes(url.hostname.toLowerCase()))
        return null;
      const match = url.pathname.match(/^\/member\/([^/]+)\/?$/i);
      if (!match) return null;
      name = decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }
  name = name.replace(/^@/, "").toLowerCase();
  return /^[-_a-z0-9]{1,40}$/.test(name) ? name : null;
}

export const chessComUsernameHelp =
  "Enter your Chess.com username or a chess.com/member/username profile link, not an email address or password.";
