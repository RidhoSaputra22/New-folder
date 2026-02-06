"use client";

import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import UserForm from "@/components/users/UserForm";
import UserTable from "@/components/users/UserTable";
import Alert from "@/components/ui/Alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function UsersPage() {
  const { user } = useAuth();
  const { users, loading, error, addUser, editUser, removeUser } = useUsers();

  // Only admin can access this page
  if (user?.role !== "ADMIN") {
    return (
      <>
        <h1>Kelola Pengguna</h1>
        <Alert variant="error">Hanya Admin yang bisa mengakses halaman ini.</Alert>
      </>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Memuat data pengguna..." />;
  }

  return (
    <>
      <h1>Kelola Pengguna</h1>
      <p className="text-sm opacity-70">
        Tambah, edit, atau nonaktifkan pengguna sistem. Jumlah pengguna: <strong>{users.length}</strong>
      </p>

      {error && <Alert variant="error">{error}</Alert>}

      <UserForm onCreated={addUser} />
      <UserTable users={users} onEdit={editUser} onDelete={removeUser} />
    </>
  );
}
