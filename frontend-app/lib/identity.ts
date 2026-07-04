// lib/identity.ts (client)
// Leg 2 of the loginless identity tripod: a stable per-device id in
// localStorage. Legs: (1) al_sid httpOnly cookie, (2) this device id —
// rebinds the session when cookies were wiped, (3) server-side IP hash in
// session meta (soft signal only, never sole key). Recovery for total loss:
// magic link to the lead's email (/api/session/recover-request).

const KEY = "al_device_id";

export function getDeviceId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null; // storage blocked — cookie leg still works
  }
}
