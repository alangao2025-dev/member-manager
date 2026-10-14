import { NextResponse } from "next/server";
import { readMembers, writeMembers, Member } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await readMembers());
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "姓名必填" }, { status: 400 });
  }
  const list = await readMembers();
  const member: Member = {
    id: Date.now().toString(),
    name: body.name.trim(),
    email: body.email ?? "",
    phone: body.phone ?? "",
    level: body.level ?? "普通",
    joinedAt: new Date().toISOString().slice(0, 10),
  };
  await writeMembers([member, ...list]);
  return NextResponse.json(member, { status: 201 });
}
