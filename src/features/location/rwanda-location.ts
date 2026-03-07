import { RWANDA_LOCATION_TREE } from './rwanda-locations.generated';

type LocationTree = Record<string, Record<string, Record<string, Record<string, string[]>>>>;

const locationTree = RWANDA_LOCATION_TREE as LocationTree;

function matchKey(options: string[], value?: string) {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim().toLocaleLowerCase();
  return options.find((option) => option.toLocaleLowerCase() === normalizedValue);
}

function getProvinceNode(province?: string) {
  const provinceKey = matchKey(Object.keys(locationTree), province);
  return provinceKey ? locationTree[provinceKey] : undefined;
}

function getDistrictNode(province?: string, district?: string) {
  const provinceNode = getProvinceNode(province);
  if (!provinceNode) {
    return undefined;
  }

  const districtKey = matchKey(Object.keys(provinceNode), district);
  return districtKey ? provinceNode[districtKey] : undefined;
}

function getSectorNode(province?: string, district?: string, sector?: string) {
  const districtNode = getDistrictNode(province, district);
  if (!districtNode) {
    return undefined;
  }

  const sectorKey = matchKey(Object.keys(districtNode), sector);
  return sectorKey ? districtNode[sectorKey] : undefined;
}

function getCellNode(province?: string, district?: string, sector?: string, cell?: string) {
  const sectorNode = getSectorNode(province, district, sector);
  if (!sectorNode) {
    return undefined;
  }

  const cellKey = matchKey(Object.keys(sectorNode), cell);
  return cellKey ? sectorNode[cellKey] : undefined;
}

export function getRwandaProvinces() {
  return Object.keys(locationTree);
}

export function getRwandaDistricts(province?: string) {
  const provinceNode = getProvinceNode(province);
  return provinceNode ? Object.keys(provinceNode) : [];
}

export function getRwandaSectors(province?: string, district?: string) {
  const districtNode = getDistrictNode(province, district);
  return districtNode ? Object.keys(districtNode) : [];
}

export function getRwandaCells(province?: string, district?: string, sector?: string) {
  const sectorNode = getSectorNode(province, district, sector);
  return sectorNode ? Object.keys(sectorNode) : [];
}

export function getRwandaVillages(
  province?: string,
  district?: string,
  sector?: string,
  cell?: string,
) {
  const cellNode = getCellNode(province, district, sector, cell);
  return cellNode ? [...cellNode] : [];
}
