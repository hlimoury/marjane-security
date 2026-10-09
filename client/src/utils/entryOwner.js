export function withOwner(fields, previous, userId) {
  if (previous?._id) {
    return { ...fields, _id: previous._id, created_by: previous.created_by };
  }
  return {
    ...fields,
    _id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    created_by: userId,
  };
}

export function canChangeEntry(entry, userId, agent) {
  if (!agent) return true;
  if (entry?.validated) return false;
  return Number(entry?.created_by) === Number(userId);
}
