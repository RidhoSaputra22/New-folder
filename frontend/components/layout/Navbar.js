"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isAdmin = user?.role === "ADMIN";

  function navLink(href, label) {
    const active = pathname === href;
    return (
      <li key={href}>
        <Link href={href} className={active ? "active" : ""}>
          {label}
        </Link>
      </li>
    );
  }

  return (
    <div className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-50 px-4">
      <div className="navbar-start">
        <Link href="/dashboard" className="btn btn-ghost text-success font-bold normal-case text-lg">
          Visitor Monitoring
        </Link>
      </div>

      <div className="navbar-center hidden sm:flex">
        <ul className="menu menu-horizontal px-1 gap-1">
          {navLink("/dashboard", "Dashboard")}
          {navLink("/camera", "Kamera")}
          {isAdmin && navLink("/users", "Pengguna")}
          {isAdmin && navLink("/visits", "Data Kunjungan")}
        </ul>
      </div>

      {/* Mobile menu */}
      <div className="navbar-center sm:hidden">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </label>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            {navLink("/dashboard", "Dashboard")}
            {navLink("/camera", "Kamera")}
            {isAdmin && navLink("/users", "Pengguna")}
            {isAdmin && navLink("/visits", "Data Kunjungan")}
          </ul>
        </div>
      </div>

      <div className="navbar-end gap-3">
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold hidden sm:inline">{user.full_name}</span>
            <span className={`badge badge-sm ${isAdmin ? "badge-warning" : "badge-success"}`}>{user.role}</span>
          </div>
        )}
        <button onClick={logout} className="btn btn-outline btn-sm">
          Logout
        </button>
      </div>
    </div>
  );
}
