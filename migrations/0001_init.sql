CREATE TABLE members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT '普通',
  joined_at TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

INSERT INTO members (id, name, email, phone, level, joined_at, created_at) VALUES
  ('1', '张伟', 'zhangwei@example.com', '13800138001', '金卡', '2025-01-15', 4),
  ('2', '李娜', 'lina@example.com', '13800138002', '银卡', '2025-03-02', 3),
  ('3', '王芳', 'wangfang@example.com', '13800138003', '钻石', '2025-05-20', 2),
  ('4', '刘洋', 'liuyang@example.com', '13800138004', '普通', '2025-08-11', 1);
