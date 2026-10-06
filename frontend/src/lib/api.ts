/**
 * Synaptix Frontend Central API Configuration
 * Supports local development ("http://localhost:5000") and production deployment via NEXT_PUBLIC_API_URL.
 */
export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

export const API_BASE = `${API_BASE_URL}/api`;
export const API_URL = API_BASE;
export const API = API_BASE;

