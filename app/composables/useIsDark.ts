// Whether the app is in dark mode (the system's choice, or the visitor's in the info sheet)
export function useIsDark() {
  const colorMode = useColorMode();
  return computed(() => colorMode.value === "dark");
}
