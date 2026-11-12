// A census value (typology, period, geology, land use) in the UI's language (utils/censusTerms)
export function useCensusTerm() {
  const i18n = useI18n();
  return (field: CensusField, value: string) => censusTerm(i18n, field, value);
}
