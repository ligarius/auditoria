import fs from 'node:fs';

import Handlebars from 'handlebars';

import { resolveAsset } from '@/utils/resolveAsset';

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

const templatePath = resolveAsset('module-report.hbs');
const templateSource = fs.readFileSync(templatePath, 'utf8');
const template = Handlebars.compile<ModuleReportTemplateData>(templateSource);

export const renderModuleReport = (data: ModuleReportTemplateData) => {
  return template(data);
};
