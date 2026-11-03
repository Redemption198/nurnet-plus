// Files imported as text (Vite's ?raw), for the tests: the app's own types come from Nuxt
declare module "*?raw" {
  const content: string;
  export default content;
}
