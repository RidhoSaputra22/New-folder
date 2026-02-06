"use client";

import { useAuth } from "@/context/AuthContext";
import { useCamera } from "@/hooks/useCamera";
import CameraForm from "@/components/camera/CameraForm";
import CountingAreaForm from "@/components/camera/CountingAreaForm";
import ConfigPreview from "@/components/camera/ConfigPreview";
import Alert from "@/components/ui/Alert";

export default function CameraPage() {
  const { user } = useAuth();
  const { camera, areas, error, reload } = useCamera(1);
  const isAdmin = user?.role === "ADMIN";

  return (
    <>
      <h1>Konfigurasi Kamera</h1>

      {!isAdmin && (
        <Alert variant="info">
          Anda login sebagai Operator. Konfigurasi kamera hanya dapat diubah oleh Admin.
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {isAdmin ? (
        <>
          <CameraForm camera={camera} onSaved={reload} />
          <CountingAreaForm areas={areas} onSaved={reload} />
        </>
      ) : (
        /* Operator: read-only view of camera info */
        camera && (
          <div className="card bg-base-100 border border-base-300 p-5 mt-4">
            <h2 className="text-lg font-semibold mb-3">Informasi Kamera</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="opacity-70">Nama:</span>{" "}
                <strong>{camera.name}</strong>
              </div>
              <div>
                <span className="opacity-70">Lokasi:</span>{" "}
                <strong>{camera.location || "-"}</strong>
              </div>
              <div>
                <span className="opacity-70">Stream URL:</span>{" "}
                <strong className="break-all">{camera.stream_url || "-"}</strong>
              </div>
              <div>
                <span className="opacity-70">Status:</span>{" "}
                <span className={`badge badge-sm ${camera.is_active ? "badge-success" : "badge-error"}`}>
                  {camera.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            </div>
            {areas.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm mb-2">Area Hitung:</h3>
                {areas.map((a) => (
                  <div key={a.area_id} className="text-sm pl-3 border-l-2 border-success mb-2">
                    <strong>{a.name}</strong> — {a.direction_mode}{" "}
                    <span className={`badge badge-xs ${a.is_active ? "badge-success" : "badge-error"}`}>
                      {a.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}

      <ConfigPreview camera={camera} areas={areas} />
    </>
  );
}
