import { BRAND, BRAND_DARK } from "./brand";

// The site categories: one place for their names, colours and icons, for the list and the map's
// markers (mapMarkers.ts). Colours are dark enough for white text (4.5:1) and for icons on the
// light panels (3:1). In dark mode the list, chips and legend use darkColor: the same hue, light
// enough for icons on the dark chips (3:1) and for dark text on the selected chip (4.5:1). The
// map's markers keep `color`: their white ring carries them on the dark map

export interface Category {
  name: string;
  // The category_id values in the data that belong to it
  ids: string[];
  color: string;
  darkColor: string;
  // Component name of its pictogram, null for the generic "?" icon
  icon:
    | "IconNurnetPlus"
    | "IconDomusJanas"
    | "IconTombaGiganti"
    | "IconVillaggioNuragico"
    | "IconMenhir"
    | "IconCultoAcqua"
    | "IconDolmen"
    | "IconTafone"
    | null;
}

// Most common first: the order of the filter chips
export const CATEGORIES: Category[] = [
  {
    name: "Nuraghe",
    ids: ["10", "11", "12", "13"],
    color: BRAND.terracotta,
    darkColor: "#ed5f01",
    icon: "IconNurnetPlus",
  },
  {
    name: "Domus de janas",
    ids: ["30"],
    color: "#ad5d58",
    darkColor: "#bc7b77",
    icon: "IconDomusJanas",
  },
  {
    name: "Tombe dei giganti",
    ids: ["60", "61", "62", "63"],
    color: "#9e6842",
    darkColor: "#ba8159",
    icon: "IconTombaGiganti",
  },
  {
    name: "Villaggi",
    ids: ["40", "41"],
    color: "#9d6b03",
    darkColor: "#c08304",
    icon: "IconVillaggioNuragico",
  },
  {
    name: "Unicum e Grotte Tafoni",
    ids: ["110", "101"],
    color: "#737571",
    darkColor: "#8c8e8b",
    icon: "IconTafone",
  },
  // Basalt in both modes: dark basalt on the light panels, light (the dark mode's text) on dark
  {
    name: "Menhir",
    ids: ["70", "71", "72", "73"],
    color: BRAND.basalt,
    darkColor: BRAND_DARK.basalt,
    icon: "IconMenhir",
  },
  {
    name: "Culto dell'acqua",
    ids: ["50", "51", "52"],
    color: "#3a79ab",
    darkColor: "#5393c5",
    icon: "IconCultoAcqua",
  },
  { name: "Dolmen", ids: ["20", "21"], color: "#7d7534", darkColor: "#9a9040", icon: "IconDolmen" },
  // Anything else, including sites without a category
  { name: "Sconosciuto", ids: [], color: "#6b625b", darkColor: "#a39588", icon: null },
];

const UNKNOWN = CATEGORIES.at(-1)!;
const byId = new Map(CATEGORIES.flatMap((category) => category.ids.map((id) => [id, category])));

export const categoryOf = (categoryId: string | null | undefined): Category =>
  byId.get(categoryId ?? "") ?? UNKNOWN;

// What the conservation status means to a visitor, from the free-text values in the data
export function statusOf(stato: string | null | undefined) {
  const value = (stato ?? "").trim().toLowerCase();
  if (["mantenuto", "manutenuto", "buono"].includes(value))
    return { label: "Mantenuto", icon: "i-lucide-shield-check" };
  if (value === "diroccato") return { label: "Diroccato", icon: "i-lucide-construction" };
  if (value === "non visibile") return { label: "Non visibile", icon: "i-lucide-eye-off" };
  return null;
}
