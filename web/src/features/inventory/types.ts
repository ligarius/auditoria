export interface LabelInfo {
  id: string;
  printedAt: string | null;
  installedAt: string | null;
}

export interface SkuItem {
  id: string;
  code: string;
  name: string;
  uom: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  label: LabelInfo | null;
}

export interface LocationItem {
  id: string;
  codeZRNP: string;
  row: number;
  level: number;
  pos: number;
  expectedQty: number | null;
  zone: { id: string; code: string; name: string };
  rack: { id: string; code: string; name: string };
  label: LabelInfo | null;
}

export interface ZoneSummary {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  totalLocations: number;
  installedLocations: number;
}
