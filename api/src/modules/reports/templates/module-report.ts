import { readFileSync } from 'node:fs';

import Handlebars from 'handlebars';

export interface ReportMetric {
  label: string;
  value: string;
}

export interface ReportEntryMetadata {
  label: string;
  value: string;
}

export interface ReportEntry {
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: ReportEntryMetadata[];
}

export interface ReportSection {
  id: string;
  title: string;
  description?: string;
  metrics?: ReportMetric[];
  entries?: ReportEntry[];
}

export interface ModuleReportTemplateData {
  projectName: string;
  companyName: string;
  reportTitle: string;
  preparedBy: string;
  generatedAt: string;
  sections: ReportSection[];
  signatures: { label: string; name?: string | null }[];
}

const templateSource = readFileSync(
  new URL('./module-report.hbs', import.meta.url),
  'utf-8'
);
const template = Handlebars.compile<ModuleReportTemplateData>(templateSource);

export const renderModuleReport = (data: ModuleReportTemplateData) => {
  return template(data);
};
