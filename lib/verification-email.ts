export type EmailEnvironment = {
  EMAIL_PROVIDER?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_VERIFICATION_ENABLED?: string;
};
export type VerificationEmail = { email: string; otp: string };
export class EmailDeliveryError extends Error {
  constructor() { super("We couldn’t send your verification code. Please try again shortly."); }
}
const validEmail = (value: string) => /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) && value.length <= 254;
export function emailDeliveryConfigured(env: EmailEnvironment) {
  return ["brevo", "resend"].includes(env.EMAIL_PROVIDER || "") && !!env.EMAIL_API_KEY?.trim() && validEmail(env.EMAIL_FROM?.trim() || "");
}
export function createVerificationEmailSender(env: EmailEnvironment, request: typeof fetch = fetch) {
  if (!emailDeliveryConfigured(env)) return undefined;
  return async ({ email, otp }: VerificationEmail) => {
    if (!validEmail(email) || !/^\d{6}$/.test(otp)) throw new EmailDeliveryError();
    const text = `Your Chess Infinity verification code is ${otp}.\n\nEnter this code in the signup popup to verify your email. It expires in 10 minutes. Only the newest code works.\n\nIf you didn’t request this, you can ignore this email. Never share your code.\n\nChess Infinity Academy`;
    const html = `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#141218;font-family:Arial,sans-serif;color:#eeeaf6"><div style="max-width:480px;margin:auto;padding:32px;background:#211b2a;border:1px solid #44324f;border-radius:20px"><p style="color:#c6a6ee;font-size:19px;font-weight:bold">∞ &nbsp; chess infinity</p><h1 style="font-size:26px;margin-top:30px">One last move.</h1><p style="color:#c2b4cf;line-height:1.8">Enter this code in your signup popup to verify your email.</p><p style="padding:22px 12px;background:#141018;border-radius:12px;text-align:center;font:700 35px monospace;letter-spacing:8px;color:#ddc4ff">${otp}</p><p style="color:#b9a7c7;font-size:13px;line-height:1.8">Expires in 10 minutes. Only the newest code works.<br>Never share this code with anyone.</p><p style="color:#96839f;font-size:12px;line-height:1.8;margin-top:28px">If you didn’t request this, you can ignore this email.</p></div></body></html>`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const brevo = env.EMAIL_PROVIDER === "brevo";
      const response = await request(brevo ? "https://api.brevo.com/v3/smtp/email" : "https://api.resend.com/emails", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json", "Accept": "application/json", ...(brevo ? { "api-key": env.EMAIL_API_KEY!.trim() } : { Authorization: `Bearer ${env.EMAIL_API_KEY!.trim()}` }) },
        body: JSON.stringify(brevo ? {
          sender: { name: "Chess Infinity", email: env.EMAIL_FROM!.trim() }, to: [{ email }],
          subject: "Verify your email · Chess Infinity", htmlContent: html,
        } : {
          from: `Chess Infinity <${env.EMAIL_FROM!.trim()}>`, to: [email],
          subject: "Verify your email · Chess Infinity", html, text,
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      const key = brevo ? "messageId" : "id";
      if (!response.ok || !data || typeof data !== "object" || !(key in data) || typeof (data as Record<string, unknown>)[key] !== "string" || !(data as Record<string, string>)[key].trim()) throw new EmailDeliveryError();
    } catch { throw new EmailDeliveryError(); }
    finally { clearTimeout(timer); }
  };
}
