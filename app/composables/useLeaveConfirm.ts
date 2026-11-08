// For links to sites the census cites (a site's source, the links from its description): nobody at
// NurNet+ vouches for them and some may have changed, so a tap asks first (LeaveDialog). A
// modified click (new tab, new window) or a long press goes through, as on any link
export function useLeaveConfirm() {
  const leaveUrl = useLeaveUrl();
  return (event: MouseEvent, url: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    leaveUrl.value = url;
  };
}
