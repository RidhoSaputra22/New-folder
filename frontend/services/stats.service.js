import { get, post } from "./api";

/**
 * GET /api/me — current user profile.
 */
export function fetchMe() {
  return get("/api/me");
}

/**
 * GET /api/stats/summary?day=YYYY-MM-DD
 */
export function fetchSummary(day) {
  return get(`/api/stats/summary?day=${day}`);
}

/**
 * GET /api/stats/daily?day=YYYY-MM-DD
 */
export function fetchDaily(day) {
  return get(`/api/stats/daily?day=${day}`);
}

/**
 * POST /api/admin/reset-db — reset visitor data (admin only).
 */
export function resetDatabase() {
  return post("/api/admin/reset-db", {});
}
