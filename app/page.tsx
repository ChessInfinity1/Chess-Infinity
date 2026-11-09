import Academy from "../components/chess/Academy";
import { getChatGPTUser } from "./chatgpt-auth";
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
            }
          : null
      }
    />
  );
}
