// A census value (typology, period, geology, land use) in the UI's language (utils/censusTerms)
export function useCensusTerm() {
  const i18n = useI18n();
  return (field: CensusField, value: string) =>
    censusTermParts(value)
      .map((part) => {
        const key = censusTermKey(field, part);
        return i18n.te(key) ? i18n.t(key) : part;
      })
      .join(" / ");
}
