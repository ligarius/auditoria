import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { prisma } from '../../core/config/db.js';

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const createSheet = (workbook: ExcelJS.Workbook, name: string, columns: string[], rows: any[]) => {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(columns);
  rows.forEach((row) => sheet.addRow(columns.map((key) => row[key])));
};

export const exportService = {
  async excelZip(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, include: { company: true } });
    if (!project) throw new Error('Proyecto no encontrado');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Auditoría';

    const dataItems = await prisma.dataRequestItem.findMany({ where: { projectId } });
    createSheet(workbook, 'DataRequest', ['category', 'title', 'status', 'ownerName', 'dueDate', 'notes'], dataItems);

    const systems = await prisma.systemInventory.findMany({ where: { projectId } });
    createSheet(workbook, 'Sistemas', ['systemName', 'type', 'ownerArea', 'usersActive', 'criticality', 'notes'], systems);

    const coverages = await prisma.processCoverage.findMany({ where: { projectId } });
    createSheet(workbook, 'Cobertura', ['process', 'subProcess', 'systemNameRef', 'coverage', 'hasGap', 'gapDesc'], coverages);

    const integrations = await prisma.integration.findMany({ where: { projectId } });
    createSheet(workbook, 'Integraciones', ['source', 'target', 'type', 'periodicity', 'dailyVolume', 'notes'], integrations);

    const risks = await prisma.risk.findMany({ where: { projectId } });
    createSheet(workbook, 'Riesgos', ['category', 'description', 'probability', 'impact', 'severity', 'rag'], risks);

    const findings = await prisma.finding.findMany({ where: { projectId } });
    createSheet(workbook, 'Hallazgos', ['title', 'impact', 'recommendation', 'responsibleR', 'accountableA', 'status'], findings);

    const pocs = await prisma.pOCItem.findMany({ where: { projectId } });
    createSheet(workbook, 'POC', ['item', 'description', 'owner', 'status'], pocs);

    const decisions = await prisma.decisionLog.findMany({ where: { projectId } });
    createSheet(workbook, 'Decisiones', ['date', 'topic', 'decision', 'approverA'], decisions);

    const receptions = await prisma.reception.findMany({ where: { projectId } });
    createSheet(workbook, 'Recepciones', ['date', 'truckPlate', 'carrier', 'dock', 'issues'], receptions);

    const kpis = await prisma.kPI.findMany({ where: { projectId } });
    createSheet(workbook, 'KPIs', ['name', 'value', 'unit', 'date'], kpis);

    const filePath = path.join(tmpDir, `export-${projectId}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    const zipPath = path.join(tmpDir, `export-${projectId}.zip`);
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip');
      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));
      archive.pipe(output);
      archive.file(filePath, { name: `${project.name}.xlsx` });
      archive.finalize();
    });

    return zipPath;
  },

  async pdf(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, include: { company: true } });
    if (!project) throw new Error('Proyecto no encontrado');
    const risks = await prisma.risk.findMany({ where: { projectId }, orderBy: { severity: 'desc' }, take: 10 });
    const findings = await prisma.finding.findMany({ where: { projectId }, take: 10 });
    const kpis = await prisma.kPI.findMany({ where: { projectId }, orderBy: { date: 'asc' } });

    const pdfPath = path.join(tmpDir, `resumen-${projectId}.pdf`);
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));
    doc.fontSize(20).text('Informe Ejecutivo', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`${project.company.name} - ${project.name}`);
    doc.text(`Estado: ${project.status}`);
    doc.text(`Periodo: ${project.startDate ? dayjs(project.startDate).format('DD/MM/YYYY') : ''} - ${project.endDate ? dayjs(project.endDate).format('DD/MM/YYYY') : ''}`);

    doc.moveDown().fontSize(16).text('Top 10 Riesgos');
    risks.forEach((risk, index) => {
      doc.fontSize(12).text(`${index + 1}. ${risk.description} (Severidad ${risk.severity} - ${risk.rag})`);
    });

    doc.moveDown().fontSize(16).text('Top 10 Hallazgos');
    findings.forEach((finding, index) => {
      doc.fontSize(12).text(`${index + 1}. ${finding.title} - ${finding.status}`);
    });

    doc.moveDown().fontSize(16).text('KPIs');
    kpis.forEach((kpi) => {
      doc.fontSize(12).text(`${dayjs(kpi.date).format('DD/MM/YYYY')} - ${kpi.name}: ${kpi.value} ${kpi.unit ?? ''}`);
    });

    doc.end();
    await new Promise((resolve) => doc.on('finish', resolve));

    return pdfPath;
  }
};
