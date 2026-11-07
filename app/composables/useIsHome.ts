// The drawer's home (search and list) rather than a site's page, in either language ("/" or "/en/")
export function useIsHome() {
  const route = useRoute();
  return computed(() => !("id" in route.params));
}
