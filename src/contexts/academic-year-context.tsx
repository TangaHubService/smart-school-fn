import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../features/auth/auth.context';
import {
  AcademicYearSummary,
  AcademicYearPreference,
  getAcademicYearPreferenceApi,
  setAcademicYearPreferenceApi,
  listAcademicYearsApi,
} from '../api/academy-api';

interface AcademicYearContextValue {
  academicYearId: string | null;
  termId: string | null;
  setAcademicYear: (id: string) => Promise<void>;
  setTerm: (id: string | null) => Promise<void>;
  availableYears: AcademicYearSummary[];
  availableTerms: AcademicYearSummary['terms'];
  isLoading: boolean;
}

const AcademicYearContext = createContext<AcademicYearContextValue>({
  academicYearId: null,
  termId: null,
  setAcademicYear: async () => {},
  setTerm: async () => {},
  availableYears: [],
  availableTerms: [],
  isLoading: true,
});

/**
 * Sent as `academicYearId` when the user explicitly picks "All years". If the param is
 * left out, the backend falls back to the saved year, so "All years" would show one year.
 */
export const ALL_ACADEMIC_YEARS = 'all';

/** Maps a year filter ('' = "All years") to the value list endpoints expect. */
export function toAcademicYearParam(yearFilter: string): string {
  return yearFilter || ALL_ACADEMIC_YEARS;
}

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [pref, setPref] = useState<AcademicYearPreference | null>(null);
  const [availableYears, setAvailableYears] = useState<AcademicYearSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.accessToken) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        const [yearsRes, prefRes] = await Promise.all([
          listAcademicYearsApi(auth.accessToken!, { isActive: true }),
          getAcademicYearPreferenceApi(auth.accessToken!),
        ]);
        setAvailableYears(Array.isArray(yearsRes) ? yearsRes : []);
        setPref(prefRes);
      } catch {
        // Silently fail - context will just have no selection
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [auth.accessToken]);

  const selectedYear = availableYears.find(y => y.id === pref?.academicYearId);
  const availableTerms = selectedYear?.terms ?? [];

  const setAcademicYear = async (academicYearId: string) => {
    if (!auth.accessToken) return;
    try {
      const updated = await setAcademicYearPreferenceApi(auth.accessToken, { academicYearId });
      setPref(updated);
      // Many list endpoints fall back to the saved year when a request has no year, and
      // their query keys don't include it. Refetch so nothing keeps showing the old year.
      void queryClient.invalidateQueries();
    } catch {
      // handle error silently
    }
  };

  const setTerm = async (termId: string | null) => {
    if (!auth.accessToken || !pref?.academicYearId) return;
    try {
      const updated = await setAcademicYearPreferenceApi(auth.accessToken, {
        academicYearId: pref.academicYearId,
        ...(termId ? { termId } : {}),
      });
      setPref(updated);
      void queryClient.invalidateQueries();
    } catch {
      // handle error silently
    }
  };

  return (
    <AcademicYearContext.Provider
      value={{
        academicYearId: pref?.academicYearId ?? null,
        termId: pref?.termId ?? null,
        setAcademicYear,
        setTerm,
        availableYears,
        availableTerms,
        isLoading,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  return useContext(AcademicYearContext);
}
