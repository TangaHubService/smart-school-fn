import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { SearchableSelect } from '../../components/ui/searchable-select';
import { listEacCountriesApi, listLocationDivisionsApi } from './location.api';

const MAX_LEVELS = 4;

/**
 * Filter values sent to list endpoints. Schools store the country name and the
 * level 1-4 division names in country/province/district/sector/cell, whatever the
 * country calls those levels (Kenya's level 1 is "County", for example).
 */
export interface LocationFilterValue {
  country?: string;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
}

const LEVEL_PARAM_KEYS = ['province', 'district', 'sector', 'cell'] as const;

interface LocationFilterProps {
  onChange: (value: LocationFilterValue) => void;
}

const EMPTY_LEVELS = ['', '', '', ''];

/**
 * Searchable country dropdown followed by one searchable dropdown per administrative
 * level of the chosen country. Each level lists only the divisions inside the one
 * picked above it. A level counts as a filter only once an option is picked, and
 * changing a level clears every level below it. Remount (change `key`) to reset.
 */
export function LocationFilter({ onChange }: LocationFilterProps) {
  const countriesQuery = useQuery({
    queryKey: ['eac-countries'],
    queryFn: () => listEacCountriesApi(),
    staleTime: 60 * 60 * 1000,
  });

  const [countryText, setCountryText] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [levelTexts, setLevelTexts] = useState<string[]>(EMPTY_LEVELS);
  const [levelIds, setLevelIds] = useState<string[]>(EMPTY_LEVELS);

  const countries = countriesQuery.data ?? [];
  const selectedCountry = countries.find((country) => country.code === countryCode);
  const levelDefs = (selectedCountry?.levels ?? []).slice(0, MAX_LEVELS);

  const level1Query = useQuery({
    queryKey: ['location-divisions', countryCode, 1, undefined],
    queryFn: () => listLocationDivisionsApi(countryCode, 1),
    enabled: Boolean(countryCode) && levelDefs.length >= 1,
    staleTime: 60 * 60 * 1000,
  });
  const level2Query = useQuery({
    queryKey: ['location-divisions', countryCode, 2, levelIds[0]],
    queryFn: () => listLocationDivisionsApi(countryCode, 2, levelIds[0]),
    enabled: Boolean(countryCode) && levelDefs.length >= 2 && Boolean(levelIds[0]),
    staleTime: 60 * 60 * 1000,
  });
  const level3Query = useQuery({
    queryKey: ['location-divisions', countryCode, 3, levelIds[1]],
    queryFn: () => listLocationDivisionsApi(countryCode, 3, levelIds[1]),
    enabled: Boolean(countryCode) && levelDefs.length >= 3 && Boolean(levelIds[1]),
    staleTime: 60 * 60 * 1000,
  });
  const level4Query = useQuery({
    queryKey: ['location-divisions', countryCode, 4, levelIds[2]],
    queryFn: () => listLocationDivisionsApi(countryCode, 4, levelIds[2]),
    enabled: Boolean(countryCode) && levelDefs.length >= 4 && Boolean(levelIds[2]),
    staleTime: 60 * 60 * 1000,
  });
  const levelQueries = [level1Query, level2Query, level3Query, level4Query];

  useEffect(() => {
    const value: LocationFilterValue = {};
    if (selectedCountry) {
      value.country = selectedCountry.nameEn;
      levelIds.forEach((id, index) => {
        if (id && levelTexts[index]) {
          value[LEVEL_PARAM_KEYS[index]] = levelTexts[index];
        }
      });
    }
    onChange(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry?.code, selectedCountry?.nameEn, levelIds, levelTexts]);

  function clearLevelsFrom(index: number, texts: string[], ids: string[]) {
    for (let i = index; i < MAX_LEVELS; i += 1) {
      texts[i] = '';
      ids[i] = '';
    }
  }

  function handleCountryInput(text: string) {
    setCountryText(text);
    const exact = countries.find(
      (country) => country.nameEn.toLowerCase() === text.trim().toLowerCase()
    );
    const nextCode = exact?.code ?? '';
    if (nextCode !== countryCode) {
      setCountryCode(nextCode);
      setLevelTexts(EMPTY_LEVELS);
      setLevelIds(EMPTY_LEVELS);
    }
  }

  function handleLevelInput(levelIndex: number, text: string, pickedId?: string) {
    const options = levelQueries[levelIndex].data ?? [];
    const exact =
      pickedId ??
      options.find((option) => option.nameEn.toLowerCase() === text.trim().toLowerCase())?.id ??
      '';
    const nextTexts = [...levelTexts];
    const nextIds = [...levelIds];
    const changed = nextIds[levelIndex] !== exact;
    nextTexts[levelIndex] = text;
    nextIds[levelIndex] = exact;
    if (changed) {
      clearLevelsFrom(levelIndex + 1, nextTexts, nextIds);
    }
    setLevelTexts(nextTexts);
    setLevelIds(nextIds);
  }

  return (
    <>
      <SearchableSelect
        label="Country"
        value={countryText}
        selectedId={countryCode}
        options={countries.map((country) => ({ id: country.code, label: country.nameEn }))}
        placeholder={countriesQuery.isPending ? 'Loading countries…' : 'Search country'}
        ariaLabel="Filter by country"
        onInputChange={handleCountryInput}
        onOptionSelect={(option) => handleCountryInput(option.label)}
      />
      {Array.from({ length: MAX_LEVELS }, (_, index) => {
        const levelDef = levelDefs[index];
        const query = levelQueries[index];
        const parentMissing = index > 0 && !levelIds[index - 1];
        const disabled = !levelDef || !countryCode || parentMissing;
        const label = levelDef?.nameEn ?? DEFAULT_LEVEL_LABELS[index];
        let placeholder = `Search ${label.toLowerCase()}`;
        if (!countryCode) placeholder = 'Pick a country first';
        else if (!levelDef) placeholder = 'Not used in this country';
        else if (parentMissing) placeholder = `Pick ${(levelDefs[index - 1]?.nameEn ?? 'the level above').toLowerCase()} first`;
        else if (query.isFetching && !query.data) placeholder = 'Loading…';
        return (
          <SearchableSelect
            key={`${countryCode}-${index}`}
            label={label}
            value={levelTexts[index]}
            selectedId={levelIds[index]}
            options={(query.data ?? []).map((division) => ({
              id: division.id,
              label: division.nameEn,
            }))}
            placeholder={placeholder}
            ariaLabel={`Filter by ${label.toLowerCase()}`}
            disabled={disabled}
            onInputChange={(value) => handleLevelInput(index, value)}
            onOptionSelect={(option) => handleLevelInput(index, option.label, option.id)}
          />
        );
      })}
    </>
  );
}

const DEFAULT_LEVEL_LABELS = ['Province', 'District', 'Sector', 'Cell'];
