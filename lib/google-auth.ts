export type GoogleAuthSecrets = { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };
export function googleCredentials(secrets: GoogleAuthSecrets) {
  const clientId = secrets.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = secrets.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret || !/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) return null;
  return { clientId, clientSecret };
}

// Used for both password and Google sign-in. A return URL can never leave the
// Academy or send the learner into a login loop or an API response.
export function accountReturnPath(value: string | null | undefined, origin: string) {
  try {
    const url = new URL(value || "/", origin);
    if (url.origin !== new URL(origin).origin || url.username || url.password || /^\/(?:login|logout|api)(?:\/|$)/.test(url.pathname)) return "/";
    return url.pathname + url.search + url.hash;
  } catch { return "/"; }
}

export function googleAuthError(code: string | null | undefined) {
  if (!code) return "";
  const messages: Record<string, string> = {
    access_denied: "Google sign-in was cancelled. Try again or use your Academy email and password.",
    account_not_linked: "This email already has an Academy account. Sign in with your Academy password, then link Google in Preferences → Your data & account. Your saved progress will stay on that account.",
    email_does_not_match: "Choose the Google account with the same email address as your Academy account.",
    account_already_linked_to_different_user: "That Google account is linked to another Academy account. Sign in to the original account to keep its saved progress.",
    unable_to_link_account: "Google could not be linked. Sign in to your Academy account again, then retry from Preferences.",
    email_not_verified: "Google has not verified this email address. Verify it with Google, then try again.",
    state_mismatch: "This sign-in attempt expired or was opened in a different browser. Start again from the Academy.",
    state_not_found: "This sign-in attempt expired. Start again from the Academy.",
    invalid_state: "This sign-in attempt expired. Start again from the Academy.",
    state_security_mismatch: "This sign-in attempt expired or was opened in another browser. Start again from the Academy.",
    unable_to_get_user_info: "Google could not verify this account. Try again with a Google account that has a verified email address.",
    provider_not_found: "Google sign-in is temporarily unavailable. You can use your Academy email and password.",
    session_not_fresh: "Sign in to your Academy account again before linking Google.",
  };
  return messages[code.toLowerCase()] || "Google sign-in could not be completed. Try again or use your Academy email and password.";
}

export function googleAuthorizationUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("Google did not return a sign-in address. Please try again.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "accounts.google.com" || url.username || url.password || url.pathname !== "/o/oauth2/v2/auth") throw new Error("Google returned an unexpected sign-in address. Please try again.");
  return url.href;
}
