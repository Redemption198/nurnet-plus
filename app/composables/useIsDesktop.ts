// Tailwind's lg breakpoint (64rem), where the drawer becomes a side panel and the map shows its
// column of buttons: the one place the scripts take it from, so they agree with the lg: classes
export const useIsDesktop = () => useMediaQuery("(min-width: 64rem)");
