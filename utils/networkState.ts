/**
 * Lightweight singleton that tracks real-time network reachability outside of React.
 *
 * Initialised optimistically to `true` so the app is not blocked before
 * NetInfo/OfflineBanner fires its first event.
 *
 * `setIsOnline` is called immediately on every connectivity event (no debounce)
 * so that `apiCall` always reflects the current network state.
 */

let _isOnline = true;

export function getIsOnline(): boolean {
  return _isOnline;
}

export function setIsOnline(value: boolean): void {
  if (_isOnline !== value) {
    console.log(`[networkState] isOnline changed: ${_isOnline} → ${value}`);
    _isOnline = value;
  }
}
