/** Platform banner while room status is paused for host reclaim. */
export function HostPauseBanner() {
  return (
    <p
      className="online-entry-status online-host-pause-banner"
      role="status"
      aria-label="Hostul s-a deconectat"
    >
      Hostul s-a deconectat. Jocul este în pauză (~90s). Acțiunile sunt blocate
      până revine același host.
    </p>
  );
}
