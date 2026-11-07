// Italian lives at the root, unprefixed (nuxt.config i18n), but /it/... is a natural guess: the
// same address without "/it", so /it/poi/NUR3551/ opens that site. A route rule can't do this
// on the static site: in the browser it redirects to a fixed address, losing the site's id.
// /it alone is also a route rule, prerendered as a redirect page
export default defineNuxtRouteMiddleware((to) => {
  if (!/^\/it(\/|$)/.test(to.path)) return;
  return navigateTo(
    { path: to.path.slice(3) || "/", query: to.query, hash: to.hash },
    { replace: true, redirectCode: 301 },
  );
});
