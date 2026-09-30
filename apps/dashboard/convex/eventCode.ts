export function normalizeEventCode(eventCode?: string): string | undefined {
  if (typeof eventCode !== "string") return undefined;
  const normalized = eventCode.trim().toUpperCase();
  return normalized.length > 0 ? normalized : undefined;
}

export function canonicalizeEventCode(eventCode?: string): string | undefined {
  const normalized = normalizeEventCode(eventCode);
  if (!normalized) return undefined;
  const canonical = normalized.replace(/[^A-Z0-9]/g, "");
  return canonical.length > 0 ? canonical : undefined;
}

export function eventMatchesCode(
  event: { _id: string; eventCode?: string },
  normalizedInputCode: string,
  canonicalInputCode?: string,
): boolean {
  const candidateCode = normalizeEventCode(event.eventCode);
  if (candidateCode && candidateCode === normalizedInputCode) {
    return true;
  }

  if (canonicalInputCode) {
    const candidateCanonicalCode = canonicalizeEventCode(event.eventCode);
    if (candidateCanonicalCode && candidateCanonicalCode === canonicalInputCode) {
      return true;
    }
  }

  // Some legacy rows displayed this fallback code without persisting eventCode.
  if (!candidateCode) {
    const generatedCode = normalizeEventCode(`EVENT-${event._id.slice(-6)}`);
    if (generatedCode && generatedCode === normalizedInputCode) {
      return true;
    }
  }

  return false;
}
