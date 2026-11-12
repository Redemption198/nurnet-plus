// A site's address, prerendered (nuxt.config: each site in each language), gets the site's own
// title, description and photo for link previews, which run no script. The site's sheet renders
// in the browser only (pages/index.vue's ClientOnly), so its head is set here, on the server.
// Server only (.server.ts): the data files are read from disk, once per build, and none of this
// reaches the browser, where the data comes from the worker (workers/data-worker.ts)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detailsFor, parseIndex, type DetailsFile, type IndexFile } from "~/workers/nurnet-data";

let sites: Map<string, NurnetPOI> | undefined;
let details: DetailsFile | undefined;

// nuxt generate runs in the project's root
const read = <T>(file: string) =>
  JSON.parse(readFileSync(join(process.cwd(), "public", file), "utf8")) as T;

export default defineNuxtPlugin({
  name: "site-head",
  // The route and the page's language, both set by then
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const route = useRouter().currentRoute.value;
    if (!("id" in route.params)) return;
    sites ??= new Map(
      parseIndex(read<IndexFile>("nurnet-index.json")).map((site) => [site.content_id, site]),
    );
    const site = sites.get(route.params.id);
    if (!site) return;
    details ??= read<DetailsFile>("nurnet-details.json");
    const { typology, photos } = detailsFor(details, site.content_id);

    const i18n = nuxtApp.$i18n;
    const description = siteDescription({ ...site, typology }, i18n.t, (field, value) =>
      censusTerm(i18n, field, value),
    );
    useSeoMeta({
      title: site.name,
      ogTitle: site.name,
      description,
      ogDescription: description,
      ...(photos[0] && {
        ogImage: fullSizePhoto(photos[0]),
        ogImageAlt: site.name,
        twitterCard: "summary_large_image",
      }),
    });
  },
});
