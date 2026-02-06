import { get, post, put } from "./api";

/**
 * GET /api/cameras/:id
 */
export function fetchCamera(id = 1) {
  return get(`/api/cameras/${id}`);
}

/**
 * PUT /api/cameras/:id
 */
export function updateCamera(id = 1, data) {
  return put(`/api/cameras/${id}`, data);
}

/**
 * GET /api/cameras/:id/areas
 */
export function fetchAreas(cameraId = 1) {
  return get(`/api/cameras/${cameraId}/areas`);
}

/**
 * POST /api/areas — create new counting area.
 */
export function createArea(data) {
  return post("/api/areas", data);
}

/**
 * PUT /api/areas/:id — update existing counting area.
 */
export function updateArea(areaId, data) {
  return put(`/api/areas/${areaId}`, data);
}
