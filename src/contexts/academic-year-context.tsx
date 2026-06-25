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

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
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
        setAvailableYears(yearsRes.items);
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
