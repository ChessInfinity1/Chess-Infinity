import { notFound } from "next/navigation";
import { requireChatGPTUser } from "../chatgpt-auth";
import { isAcademyOwner } from "../../lib/developer-access";
import DeveloperPanel from "../../components/developer/DeveloperPanel";
export const dynamic = "force-dynamic";
export const metadata = { title: "Developer panel · Chess Infinity", robots: { index: false, follow: false } };
export default async function DeveloperPage() {
  const user = await requireChatGPTUser("/developer");
  if (!isAcademyOwner(user)) notFound();
  return <DeveloperPanel ownerName={user.displayName} />;
}
