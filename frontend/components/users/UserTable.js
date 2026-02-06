"use client";

import { useState } from "react";
import Table from "@/components/ui/Table";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const ROLE_OPTIONS = [
  { value: "OPERATOR", label: "Operator" },
  { value: "ADMIN", label: "Admin" },
];

/**
 * Table listing all users with edit/deactivate actions.
 */
export default function UserTable({ users = [], onEdit, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(user) {
    setEditingId(user.user_id);
    setEditData({
      full_name: user.full_name,
      role: user.role,
      password: "",
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
    setError("");
  }

  async function saveEdit(userId) {
    setSaving(true);
    setError("");
    try {
      const payload = {};
      if (editData.full_name) payload.full_name = editData.full_name;
      if (editData.role) payload.role = editData.role;
      if (editData.password) payload.password = editData.password;
      
      await onEdit(userId, payload);
      setEditingId(null);
      setEditData({});
    } catch (e) {
      setError(e.message || "Gagal update user");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    if (!confirm(`Yakin ingin menonaktifkan user "${user.username}"?`)) return;
    try {
      await onDelete(user.user_id);
    } catch (e) {
      setError(e.message || "Gagal menonaktifkan user");
    }
  }

  const columns = ["ID", "Username", "Nama Lengkap", "Role", "Status", "Aksi"];

  const rows = users.map((u) => {
    if (editingId === u.user_id) {
      return [
        u.user_id,
        u.username,
        <Input
          key="name"
          value={editData.full_name || ""}
          onChange={(e) => setEditData((d) => ({ ...d, full_name: e.target.value }))}
          className="input-sm"
        />,
        <Select
          key="role"
          options={ROLE_OPTIONS}
          value={editData.role || "OPERATOR"}
          onChange={(e) => setEditData((d) => ({ ...d, role: e.target.value }))}
          className="select-sm"
        />,
        <span key="s" className={`badge ${u.is_active ? "badge-success" : "badge-error"} badge-sm`}>
          {u.is_active ? "Aktif" : "Nonaktif"}
        </span>,
        <div key="actions" className="flex gap-1">
          <Input
            placeholder="Password baru (opsional)"
            type="password"
            value={editData.password || ""}
            onChange={(e) => setEditData((d) => ({ ...d, password: e.target.value }))}
            className="input-sm w-36"
          />
          <Button variant="primary" loading={saving} onClick={() => saveEdit(u.user_id)} className="btn-sm">
            Simpan
          </Button>
          <button onClick={cancelEdit} className="btn btn-ghost btn-sm">
            Batal
          </button>
        </div>,
      ];
    }

    return [
      u.user_id,
      u.username,
      u.full_name,
      <span key="r" className={`badge ${u.role === "ADMIN" ? "badge-warning" : "badge-info"} badge-sm`}>
        {u.role}
      </span>,
      <span key="s" className={`badge ${u.is_active ? "badge-success" : "badge-error"} badge-sm`}>
        {u.is_active ? "Aktif" : "Nonaktif"}
      </span>,
      <div key="actions" className="flex gap-1">
        <button onClick={() => startEdit(u)} className="btn btn-ghost btn-sm">
          Edit
        </button>
        {u.is_active && (
          <button onClick={() => handleDelete(u)} className="btn btn-ghost btn-sm text-error">
            Nonaktifkan
          </button>
        )}
      </div>,
    ];
  });

  return (
    <Section title="Daftar Pengguna">
      {error && <Alert variant="error">{error}</Alert>}
      <Table columns={columns} rows={rows} emptyText="Belum ada pengguna." />
    </Section>
  );
}
