import countriesData from '../data/countries.json';

const standardCountries = countriesData
  .filter((country) => country?.name && country?.code)
  .map((country) => ({
    code: String(country.code).trim(),
    name: String(country.name).trim(),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const getStandardCountryList = () => standardCountries;

export const getStandardCountryNameSet = () =>
  new Set(standardCountries.map((country) => country.name.toLowerCase()));
