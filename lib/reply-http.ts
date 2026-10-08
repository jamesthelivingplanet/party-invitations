const failureStatuses: Record<string, number> = {
  unknown_link: 404,
  closed: 403,
  no_longer_available: 410,
  companion_count: 400,
  companion_incomplete: 400,
};

/** The HTTP status for a submit outcome that failed, or undefined when the outcome is not a known failure. */
export function failureStatus(outcome: string): number | undefined {
  return failureStatuses[outcome];
}
