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

export const useCategoryColor = (category: number): string => {
  if (category >= 10 && category <= 13) return "bg-[#fe8535]";
  if (category === 20 || category === 21) return "bg-[#a89e46]";
  if (category === 30) return "bg-[#bc7b77]";
  if (category === 40 || category === 41) return "bg-[#CA8A04]";
  if (category >= 50 && category <= 52) return "bg-[#4d8fc3]";
  if (category >= 60 && category <= 63) return "bg-[#a96f47]";
  if (category >= 70 && category <= 73) return "bg-[#312528]";
  if (category === 110 || category === 101) return "bg-[#aaaba8]";
  return "bg-red-500";
};

export const useStatusColor = (status: string): string => {
  if (status === "manutenuto" || status === "mantenuto" || status === "buono")
    return "bg-green-500";
  if (status === "diroccato") return "bg-red-500";
  return "bg-gray-500";
};
