import Academy from "../components/chess/Academy";
import { getChatGPTUser } from "./chatgpt-auth";
import { isAcademyOwner } from "../lib/developer-access";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getChatGPTUser();
  return (
    <Academy
      user={
        user
          ? {
              id: user.userId,
              name: user.fullName?.split(" ")[0] || "Chess player",
              isOwner: isAcademyOwner(user),
            }
          : null
      }
    />
  );
}
