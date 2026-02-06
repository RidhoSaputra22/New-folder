"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-50 px-4">
      <div className="navbar-start">
        <Link href="/dashboard" className="btn btn-ghost text-success font-bold normal-case text-lg">
          Visitor Monitoring
        </Link>
      </div>

      <div className="navbar-center hidden sm:flex">
        <ul className="menu menu-horizontal px-1 gap-1">
          <li>
            <Link href="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link href="/camera">Kamera</Link>
          </li>
        </ul>
      </div>

      <div className="navbar-end gap-3">
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold hidden sm:inline">{user.full_name}</span>
            <span className="badge badge-success badge-sm">{user.role}</span>
          </div>
        )}
        <button onClick={logout} className="btn btn-outline btn-sm">
          Logout
        </button>
      </div>
    </div>
  );
}
