const USER_ID_STORAGE_KEY = "music_box_user_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `u_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  return `u_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function getOrCreateUserId(): string {
  const existing = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = randomId();
  localStorage.setItem(USER_ID_STORAGE_KEY, next);
  return next;
}
