import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { SearchableSelect, updateSearchableSelection } from '../../components/ui/searchable-select';
import { listEacCountriesApi, listLocationDivisionsApi, type LocationDivision } from './location.api';

const MAX_LEVELS = 4;

export interface LocationPickerValue {
  adminCountryCode: string;
  adminLevel1?: string;
  adminLevel2?: string;
  adminLevel3?: string;
  adminLevel4?: string;
}

interface LocationPickerProps {
  /** Snapshot used once, on mount, to prefill. Remount via `key` to re-prefill from new data. */
  initialValue?: Partial<LocationPickerValue>;
  onChange: (value: LocationPickerValue) => void;
}

function useResolvedLevelId(
  text: string,
  id: string,
  options: LocationDivision[] | undefined,
  setId: (id: string) => void
) {
  useEffect(() => {
    if (!text || id || !options) {
      return;
    }
    const match = options.find((option) => option.nameEn.toLowerCase() === text.toLowerCase());
    if (match) {
      setId(match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, id, options]);
}

export function LocationPicker({ initialValue, onChange }: LocationPickerProps) {
  const countriesQuery = useQuery({
    queryKey: ['eac-countries'],
    queryFn: () => listEacCountriesApi(),
    staleTime: 60 * 60 * 1000,
  });

  const [countryCode, setCountryCode] = useState(initialValue?.adminCountryCode ?? '');
  const [levelTexts, setLevelTexts] = useState<string[]>([
    initialValue?.adminLevel1 ?? '',
    initialValue?.adminLevel2 ?? '',
    initialValue?.adminLevel3 ?? '',
    initialValue?.adminLevel4 ?? '',
  ]);
  const [levelIds, setLevelIds] = useState<string[]>(['', '', '', '']);

  const countries = countriesQuery.data ?? [];
  const selectedCountry = countries.find((country) => country.code === countryCode);
  const levelDefs = selectedCountry?.levels ?? [];

  const level1Query = useQuery({
    queryKey: ['location-divisions', countryCode, 1, undefined],
    queryFn: () => listLocationDivisionsApi(countryCode, 1),
    enabled: Boolean(countryCode) && levelDefs.length >= 1,
  });
  const level2Query = useQuery({
    queryKey: ['location-divisions', countryCode, 2, levelIds[0]],
    queryFn: () => listLocationDivisionsApi(countryCode, 2, levelIds[0]),
    enabled: Boolean(countryCode) && levelDefs.length >= 2 && Boolean(levelIds[0]),
  });
  const level3Query = useQuery({
    queryKey: ['location-divisions', countryCode, 3, levelIds[1]],
    queryFn: () => listLocationDivisionsApi(countryCode, 3, levelIds[1]),
    enabled: Boolean(countryCode) && levelDefs.length >= 3 && Boolean(levelIds[1]),
  });
  const level4Query = useQuery({
    queryKey: ['location-divisions', countryCode, 4, levelIds[2]],
    queryFn: () => listLocationDivisionsApi(countryCode, 4, levelIds[2]),
    enabled: Boolean(countryCode) && levelDefs.length >= 4 && Boolean(levelIds[2]),
  });

  const levelQueries = [level1Query, level2Query, level3Query, level4Query];

  // Resolve saved division names -> ids so the cascade can unlock downstream levels on prefill.
  useResolvedLevelId(levelTexts[0], levelIds[0], level1Query.data, (id) =>
    setLevelIds((prev) => [id, prev[1], prev[2], prev[3]])
  );
  useResolvedLevelId(levelTexts[1], levelIds[1], level2Query.data, (id) =>
    setLevelIds((prev) => [prev[0], id, prev[2], prev[3]])
  );
  useResolvedLevelId(levelTexts[2], levelIds[2], level3Query.data, (id) =>
    setLevelIds((prev) => [prev[0], prev[1], id, prev[3]])
  );
  useResolvedLevelId(levelTexts[3], levelIds[3], level4Query.data, (id) =>
    setLevelIds((prev) => [prev[0], prev[1], prev[2], id])
  );

  useEffect(() => {
    onChange({
      adminCountryCode: countryCode,
      adminLevel1: levelTexts[0] || undefined,
      adminLevel2: levelTexts[1] || undefined,
      adminLevel3: levelTexts[2] || undefined,
      adminLevel4: levelTexts[3] || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, levelTexts]);

  function handleCountryChange(nextCode: string) {
    setCountryCode(nextCode);
    setLevelTexts(['', '', '', '']);
    setLevelIds(['', '', '', '']);
  }

  function handleLevelChange(levelIndex: number, text: string) {
    const options = levelQueries[levelIndex].data ?? [];
    const searchableOptions = options.map((option) => ({ id: option.id, label: option.nameEn }));
    setLevelTexts((prev) => {
      const next = [...prev];
      updateSearchableSelection(
        text,
        searchableOptions,
        (value) => {
          next[levelIndex] = value;
        },
        () => {}
      );
      // clear every downstream level's text/id when a level's text changes
      for (let i = levelIndex + 1; i < MAX_LEVELS; i += 1) {
        next[i] = '';
      }
      return next;
    });
    setLevelIds((prev) => {
      const next = [...prev];
      const normalized = text.trim().toLowerCase();
      const exact = options.find((option) => option.nameEn.toLowerCase() === normalized);
      next[levelIndex] = exact?.id ?? '';
      for (let i = levelIndex + 1; i < MAX_LEVELS; i += 1) {
        next[i] = '';
      }
      return next;
    });
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Country
        <select
          className="rounded-lg border border-brand-200 px-3 py-2"
          value={countryCode}
          onChange={(event) => handleCountryChange(event.target.value)}
        >
          <option value="">Select country</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.nameEn}
            </option>
          ))}
        </select>
      </label>

      {levelDefs.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {levelDefs.map((levelDef, index) => {
            const disabled = index > 0 && !levelIds[index - 1];
            return (
              <SearchableSelect
                key={levelDef.key}
                label={levelDef.nameEn}
                value={levelTexts[index]}
                selectedId={levelIds[index]}
                options={(levelQueries[index].data ?? []).map((division) => ({
                  id: division.id,
                  label: division.nameEn,
                }))}
                placeholder={`Search ${levelDef.nameEn.toLowerCase()}`}
                ariaLabel={levelDef.nameEn}
                disabled={disabled}
                onInputChange={(value) => handleLevelChange(index, value)}
                onOptionSelect={(option) => handleLevelChange(index, option.label)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
