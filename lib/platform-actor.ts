/**
 * Server-only platform actor id from env.
 * Never accept this from the browser.
 */
export function getPlatformActorUserId(): number {
  const raw = process.env.ADMIN_ACTOR_USER_ID;
  if (!raw || !String(raw).trim()) {
    throw new Error('ADMIN_ACTOR_USER_ID is not configured');
  }
  const id = Number(String(raw).trim());
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('ADMIN_ACTOR_USER_ID is invalid');
  }
  return id;
}