"use client";

import { useMemo, useState } from "react";
import type { Level, Member } from "@/lib/store";

const LEVELS: Level[] = ["普通", "银卡", "金卡", "钻石"];
const empty = { name: "", email: "", phone: "", level: "普通" as Level };

export default function MemberApp({ initial }: { initial: Member[] }) {
  const [members, setMembers] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Level | "全部">("全部");
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  const shown = useMemo(
    () =>
      members.filter(
        (m) =>
          (filter === "全部" || m.level === filter) &&
          [m.name, m.email, m.phone].some((v) => v.includes(query.trim()))
      ),
    [members, query, filter]
  );

  const stats = [
    { label: "会员总数", value: members.length },
    ...LEVELS.slice(1).map((l) => ({ label: l, value: members.filter((m) => m.level === l).length })),
  ];

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(m: Member) {
    setEditing(m);
    setForm({ name: m.name, email: m.email, phone: m.phone, level: m.level });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      const res = await fetch(`/api/members/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated: Member = await res.json();
      setMembers((l) => l.map((m) => (m.id === updated.id ? updated : m)));
    } else {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) return;
      const created: Member = await res.json();
      setMembers((l) => [created, ...l]);
    }
    setOpen(false);
  }

  async function remove(m: Member) {
    if (!confirm(`确定删除会员「${m.name}」吗?`)) return;
    await fetch(`/api/members/${m.id}`, { method: "DELETE" });
    setMembers((l) => l.filter((x) => x.id !== m.id));
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>会员管理</h1>
          <p>管理你的会员信息与等级</p>
        </div>
        <button className="btn primary" onClick={openNew}>+ 新增会员</button>
      </header>

      <section className="stats">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="搜索姓名 / 邮箱 / 手机号"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="input select" value={filter} onChange={(e) => setFilter(e.target.value as Level | "全部")}>
            <option>全部</option>
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <table>
          <thead>
            <tr><th>会员</th><th>手机号</th><th>等级</th><th>加入日期</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className="who">
                    <div className="avatar">{m.name.slice(0, 1)}</div>
                    <div>
                      <div className="name">{m.name}</div>
                      <div className="sub">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td>{m.phone}</td>
                <td><span className={`badge lv-${LEVELS.indexOf(m.level)}`}>{m.level}</span></td>
                <td>{m.joinedAt}</td>
                <td className="actions">
                  <button className="link" onClick={() => openEdit(m)}>编辑</button>
                  <button className="link danger" onClick={() => remove(m)}>删除</button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={5} className="empty">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{editing ? "编辑会员" : "新增会员"}</h2>
            <label>姓名
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>邮箱
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>手机号
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>等级
              <select className="input select" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as Level })}>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>取消</button>
              <button type="submit" className="btn primary">保存</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
