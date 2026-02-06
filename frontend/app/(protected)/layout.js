"use client";

import Navbar from "@/components/layout/Navbar";
import AuthGuard from "@/components/layout/AuthGuard";

/**
 * Layout for all protected (authenticated) pages.
 * Wraps children with AuthGuard + Navbar.
 */
export default function ProtectedLayout({ children }) {
  return (
    <AuthGuard>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
    </AuthGuard>
  );
}
