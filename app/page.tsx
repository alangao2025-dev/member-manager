import { readMembers } from "@/lib/store";
import MemberApp from "./MemberApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <MemberApp initial={await readMembers()} />;
}
