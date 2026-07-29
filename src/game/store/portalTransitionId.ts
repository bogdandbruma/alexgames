let portalTransitionId = 0;

export function nextPortalTransitionId(): number {
  portalTransitionId += 1;
  return portalTransitionId;
}
