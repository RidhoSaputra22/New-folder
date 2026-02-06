"use client";

import { useCamera } from "@/hooks/useCamera";
import CameraForm from "@/components/camera/CameraForm";
import CountingAreaForm from "@/components/camera/CountingAreaForm";
import ConfigPreview from "@/components/camera/ConfigPreview";
import Alert from "@/components/ui/Alert";

export default function CameraPage() {
  const { camera, areas, error, reload } = useCamera(1);

  return (
    <>
      <h1>Konfigurasi Kamera</h1>

      {error && <Alert variant="error">{error}</Alert>}

      <CameraForm camera={camera} onSaved={reload} />
      <CountingAreaForm areas={areas} onSaved={reload} />
      <ConfigPreview camera={camera} areas={areas} />
    </>
  );
}
