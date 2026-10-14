import { NextResponse } from "next/server";
import { readMembers, writeMembers } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const list = await readMembers();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return NextResponse.json({ error: "未找到" }, { status: 404 });
  list[idx] = { ...list[idx], name: body.name, email: body.email, phone: body.phone, level: body.level };
  await writeMembers(list);
  return NextResponse.json(list[idx]);
}

export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  const list = await readMembers();
  await writeMembers(list.filter((m) => m.id !== id));
  return NextResponse.json({ ok: true });
}
