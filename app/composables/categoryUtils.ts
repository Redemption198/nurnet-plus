export const useCategoryName = (category: number): string => {
  if (category >= 10 && category <= 13) return "Nuraghe";
  if (category === 20 || category === 21) return "Dolmen";
  if (category === 30) return "Domus de janas";
  if (category === 40 || category === 41) return "Villaggi";
  if (category >= 50 && category <= 52) return "Culto dell'acqua";
  if (category >= 60 && category <= 63) return "Tombe dei giganti";
  if (category >= 70 && category <= 73) return "Menhir";
  if (category === 110 || category === 101) return "Unicum e Grotte Tafoni";
  return "Sconosciuto";
};

// Filter chips, most common first; `id` is any category id of the group, for its colour
export const CATEGORY_FILTERS = [
  { name: "Nuraghe", id: 10 },
  { name: "Domus de janas", id: 30 },
  { name: "Tombe dei giganti", id: 60 },
  { name: "Villaggi", id: 40 },
  { name: "Unicum e Grotte Tafoni", id: 110 },
  { name: "Menhir", id: 70 },
  { name: "Culto dell'acqua", id: 50 },
  { name: "Dolmen", id: 20 },
  { name: "Sconosciuto", id: 0 },
];

// Darker than the map icons' colours (same hues) so white text meets WCAG AA (4.5:1)
export const useCategoryColor = (category: number): string => {
  if (category >= 10 && category <= 13) return "bg-[#c44f01]";
  if (category === 20 || category === 21) return "bg-[#7d7534]";
  if (category === 30) return "bg-[#ad5d58]";
  if (category === 40 || category === 41) return "bg-[#9d6b03]";
  if (category >= 50 && category <= 52) return "bg-[#3a79ab]";
  if (category >= 60 && category <= 63) return "bg-[#9e6842]";
  if (category >= 70 && category <= 73) return "bg-[#312528]";
  if (category === 110 || category === 101) return "bg-[#737571]";
  return "bg-red-700";
};

export const useStatusColor = (status: string): string => {
  if (status === "manutenuto" || status === "mantenuto" || status === "buono")
    return "bg-green-700";
  if (status === "diroccato") return "bg-red-700";
  return "bg-gray-600";
};
