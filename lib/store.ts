import { promises as fs } from "fs";
import path from "path";

export type Level = "普通" | "银卡" | "金卡" | "钻石";
export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  level: Level;
  joinedAt: string;
}

const FILE = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "members.json");

export async function readMembers(): Promise<Member[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function writeMembers(list: Member[]) {
  await fs.writeFile(FILE, JSON.stringify(list, null, 2), "utf8");
}
