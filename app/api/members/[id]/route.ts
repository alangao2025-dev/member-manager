import { NextResponse } from "next/server";
import { updateMember, deleteMember, type Member } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json()) as Partial<Member>;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "姓名必填" }, { status: 400 });
  }
  const member = await updateMember(id, {
    name: body.name.trim(),
    email: body.email ?? "",
    phone: body.phone ?? "",
    level: body.level ?? "普通",
  });
  if (!member) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(member);
}

export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  await deleteMember(id);
  return NextResponse.json({ ok: true });
}
