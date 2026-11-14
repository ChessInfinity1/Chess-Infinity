import AccountAccess from "../../components/chess/AccountAccess";
import { env } from "cloudflare:workers";
import { googleCredentials } from "../../lib/google-auth";
export const dynamic = "force-dynamic";
export default function LoginPage() { return <AccountAccess googleEnabled={!!googleCredentials(env)} />; }
