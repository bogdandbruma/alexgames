let portalTransitionId = 0;

export function nextPortalTransitionId(): string {
  portalTransitionId += 1;
  return `portal-${portalTransitionId}`;
}
