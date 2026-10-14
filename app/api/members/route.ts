import { NextResponse } from "next/server";
import { readMembers, createMember, type Member } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await readMembers());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Member>;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "姓名必填" }, { status: 400 });
  }
  const member = await createMember({
    name: body.name.trim(),
    email: body.email ?? "",
    phone: body.phone ?? "",
    level: body.level ?? "普通",
  });
  return NextResponse.json(member, { status: 201 });
}
