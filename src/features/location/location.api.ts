import { apiRequest } from '../../api/client';

export interface LocationLevel {
  key: string;
  nameEn: string;
}

export interface EacCountry {
  code: string;
  nameEn: string;
  levels: LocationLevel[];
}

export interface LocationDivision {
  id: string;
  nameEn: string;
  nameLocal: string;
}

export function listEacCountriesApi() {
  return apiRequest<EacCountry[]>('/locations/countries', { method: 'GET' });
}

export function listLocationDivisionsApi(countryCode: string, level: number, parentId?: string) {
  const query = new URLSearchParams({ level: String(level) });
  if (parentId) {
    query.set('parentId', parentId);
  }

  return apiRequest<LocationDivision[]>(`/locations/${countryCode}/divisions?${query.toString()}`, {
    method: 'GET',
  });
}
