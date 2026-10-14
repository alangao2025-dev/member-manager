import { getCloudflareContext } from "@opennextjs/cloudflare";

export type Level = "普通" | "银卡" | "金卡" | "钻石";
export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  level: Level;
  joinedAt: string;
}

type MemberInput = Pick<Member, "name" | "email" | "phone" | "level">;

const COLUMNS = "id, name, email, phone, level, joined_at AS joinedAt";

async function db() {
  return (await getCloudflareContext({ async: true })).env.DB;
}

export async function readMembers(): Promise<Member[]> {
  const { results } = await (await db())
    .prepare(`SELECT ${COLUMNS} FROM members ORDER BY created_at DESC`)
    .all<Member>();
  return results;
}

export async function createMember(input: MemberInput): Promise<Member> {
  const now = Date.now();
  const member: Member = { id: now.toString(), ...input, joinedAt: new Date(now).toISOString().slice(0, 10) };
  await (await db())
    .prepare("INSERT INTO members (id, name, email, phone, level, joined_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(member.id, member.name, member.email, member.phone, member.level, member.joinedAt, now)
    .run();
  return member;
}

export async function updateMember(id: string, input: MemberInput): Promise<Member | null> {
  return (await db())
    .prepare(`UPDATE members SET name = ?, email = ?, phone = ?, level = ? WHERE id = ? RETURNING ${COLUMNS}`)
    .bind(input.name, input.email, input.phone, input.level, id)
    .first<Member>();
}

export async function deleteMember(id: string) {
  await (await db()).prepare("DELETE FROM members WHERE id = ?").bind(id).run();
}
