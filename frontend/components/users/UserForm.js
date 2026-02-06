"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Section from "@/components/ui/Section";

const ROLE_OPTIONS = [
  { value: "OPERATOR", label: "Operator / Petugas" },
  { value: "ADMIN", label: "Admin" },
];

/**
 * Form to create a new user.
 */
export default function UserForm({ onCreated }) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("OPERATOR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !fullName.trim() || !password.trim()) {
      setError("Semua field wajib diisi");
      return;
    }
    
    setSaving(true);
    setError("");
    setOk("");
    try {
      await onCreated({ username, full_name: fullName, password, role });
      setOk(`User "${username}" berhasil dibuat`);
      setUsername("");
      setFullName("");
      setPassword("");
      setRole("OPERATOR");
      setTimeout(() => setOk(""), 3000);
    } catch (e) {
      setError(e.message || "Gagal membuat user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Tambah Pengguna Baru">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            required
          />
          <Input
            label="Nama Lengkap"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama lengkap"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <Button variant="primary" loading={saving} className="w-fit">
          Tambah User
        </Button>
        {error && <Alert variant="error">{error}</Alert>}
        {ok && <Alert variant="success">{ok}</Alert>}
      </form>
    </Section>
  );
}
