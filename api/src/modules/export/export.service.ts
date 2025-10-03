import fs from 'fs';
import path from 'path';

import archiver from 'archiver';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';

import { prisma } from '../../core/config/db.js';

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const createSheet = (
  workbook: ExcelJS.Workbook,
  name: string,
  columns: string[],
  rows: any[]
) => {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(columns);
  rows.forEach((row) => sheet.addRow(columns.map((key) => row[key])));
};

export const exportService = {
  async excelZip(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { company: true }
    });
    if (!project) throw new Error('Proyecto no encontrado');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Auditoría';

    const dataItems = await prisma.dataRequestItem.findMany({
      where: { projectId }
    });
    createSheet(
      workbook,
      'DataRequest',
      ['category', 'title', 'status', 'ownerName', 'dueDate', 'notes'],
      dataItems
    );

    const systems = await prisma.systemInventory.findMany({
      where: { projectId }
    });
    createSheet(
      workbook,
      'Sistemas',
      [
        'systemName',
        'type',
        'ownerArea',
        'usersActive',
        'criticality',
        'notes'
      ],
      systems
    );

    const coverages = await prisma.processCoverage.findMany({
      where: { projectId }
    });
    createSheet(
      workbook,
      'Cobertura',
      [
        'process',
        'subProcess',
        'systemNameRef',
        'coverage',
        'hasGap',
        'gapDesc'
      ],
      coverages
    );

    const integrations = await prisma.integration.findMany({
      where: { projectId }
    });
    createSheet(
      workbook,
      'Integraciones',
      ['source', 'target', 'type', 'periodicity', 'dailyVolume', 'notes'],
      integrations
    );

    const risks = await prisma.risk.findMany({ where: { projectId } });
    createSheet(
      workbook,
      'Riesgos',
      ['category', 'description', 'probability', 'impact', 'severity', 'rag'],
      risks
    );

    const findings = await prisma.finding.findMany({ where: { projectId } });
    createSheet(
      workbook,
      'Hallazgos',
      [
        'title',
        'impact',
        'recommendation',
        'responsibleR',
        'accountableA',
        'status'
      ],
      findings
    );

    const pocs = await prisma.pOCItem.findMany({ where: { projectId } });
    createSheet(
      workbook,
      'POC',
      ['item', 'description', 'owner', 'status'],
      pocs
    );

    const decisions = await prisma.decision.findMany({
      where: { projectId }
    });
    createSheet(
      workbook,
      'Decisiones',
      ['date', 'topic', 'decision', 'approverA'],
      decisions
    );

    const receptions = await prisma.reception.findMany({
      where: { projectId }
    });
    createSheet(
      workbook,
      'Recepciones',
      ['date', 'truckPlate', 'carrier', 'dock', 'issues'],
      receptions
    );

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
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { company: true }
    });
    if (!project) throw new Error('Proyecto no encontrado');
    const risks = await prisma.risk.findMany({
      where: { projectId },
      orderBy: { severity: 'desc' },
      take: 10
    });
    const findings = await prisma.finding.findMany({
      where: { projectId },
      take: 10
    });
    const kpis = await prisma.kPI.findMany({
      where: { projectId },
      orderBy: { date: 'asc' }
    });

    const pdfPath = path.join(tmpDir, `resumen-${projectId}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(pdfPath));

    const headerHeight = 120;
    doc.rect(0, 0, doc.page.width, headerHeight).fill('#0f172a');
    doc.fillColor('white');
    doc
      .fontSize(28)
      .text('Informe Ejecutivo', { align: 'center', baseline: 'middle' });
    doc.moveDown(0.5);
    doc.fontSize(14).text(`${project.company.name} · ${project.name}`, {
      align: 'center'
    });
    doc.moveDown(0.2);
    doc.fontSize(12).text(`Estado: ${project.status}`, { align: 'center' });
    const period = `${project.startDate ? dayjs(project.startDate).format('DD/MM/YYYY') : 'Sin inicio'} - ${
      project.endDate
        ? dayjs(project.endDate).format('DD/MM/YYYY')
        : 'Sin cierre'
    }`;
    doc.text(period, { align: 'center' });

    doc.moveDown();
    doc
      .fillColor('#0f172a')
      .fontSize(16)
      .text('Resumen ejecutivo', { underline: true });
    doc.fillColor('#1f2937').fontSize(12);
    doc.text(
      'Este informe resume el estado del proyecto, principales riesgos, hallazgos y métricas clave para la toma de decisiones.',
      {
        align: 'justify'
      }
    );

    const drawMetricRow = (metrics: { label: string; value: string }[]) => {
      doc.moveDown(0.6);
      metrics.forEach((metric) => {
        doc
          .font('Helvetica-Bold')
          .text(metric.label.toUpperCase(), { continued: true })
          .font('Helvetica')
          .text(`  ${metric.value}`);
      });
    };

    drawMetricRow([
      {
        label: 'Periodo',
        value: period
      },
      {
        label: 'Riesgos evaluados',
        value: String(risks.length)
      },
      {
        label: 'Hallazgos registrados',
        value: String(findings.length)
      },
      {
        label: 'KPIs monitoreados',
        value: String(kpis.length)
      }
    ]);

    const sectionTitle = (title: string) => {
      doc.moveDown(1);
      doc.fillColor('#0f172a').fontSize(16).text(title);
      doc.fillColor('#1f2937').fontSize(12);
      doc.moveDown(0.3);
      doc.strokeColor('#cbd5f5');
      doc.lineWidth(2);
      doc
        .moveTo(doc.x, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke();
      doc.moveDown(0.5);
    };

    const renderTable = (
      columns: { header: string; width: number }[],
      rows: string[][]
    ) => {
      const startX = doc.x;
      rows.forEach((row) => {
        columns.forEach((column, index) => {
          doc
            .font(index === 0 ? 'Helvetica-Bold' : 'Helvetica')
            .text(row[index] ?? '', startX + column.width * index, doc.y, {
              width: column.width - 10,
              continued: index < columns.length - 1
            });
        });
        doc.text('\n');
        doc.moveDown(0.2);
      });
    };

    sectionTitle('Top 10 Riesgos');
    if (risks.length === 0) {
      doc.text('No se registran riesgos cargados en el sistema.');
    } else {
      renderTable(
        [
          { header: 'Descripción', width: 260 },
          { header: 'Severidad', width: 100 },
          { header: 'RAG', width: 80 }
        ],
        risks.map((risk, index) => [
          `${index + 1}. ${risk.description}`,
          `${risk.severity}`,
          risk.rag ?? '-'
        ])
      );
    }

    sectionTitle('Top 10 Hallazgos');
    if (findings.length === 0) {
      doc.text('No existen hallazgos documentados en esta etapa.');
    } else {
      renderTable(
        [
          { header: 'Hallazgo', width: 260 },
          { header: 'Impacto', width: 150 },
          { header: 'Estado', width: 80 }
        ],
        findings.map((finding, index) => [
          `${index + 1}. ${finding.title}`,
          finding.impact,
          finding.status
        ])
      );
    }

    sectionTitle('KPIs relevantes');
    if (kpis.length === 0) {
      doc.text('Sin indicadores cargados.');
    } else {
      renderTable(
        [
          { header: 'Fecha', width: 100 },
          { header: 'Indicador', width: 200 },
          { header: 'Valor', width: 120 }
        ],
        kpis.map((kpi) => [
          dayjs(kpi.date).format('DD/MM/YYYY'),
          kpi.name,
          `${kpi.value} ${kpi.unit ?? ''}`.trim()
        ])
      );
    }

    doc.end();
    await new Promise((resolve) => doc.on('finish', resolve));

    return pdfPath;
  }
};
