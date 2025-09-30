import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import pdfFonts from 'pdfmake/build/vfs_fonts.js';
import type { EstadoProyecto as EstadoProyectoType } from '@prisma/client';
import { prisma } from '../../core/config/db.js';

const width = 900; const height = 320;

const STATUS_LABELS: Record<EstadoProyectoType, string> = {
  PLANIFICACION: 'Planificación',
  TRABAJO_CAMPO: 'Trabajo de campo',
  INFORME: 'Informe',
  CIERRE: 'Cierre',
};

async function buildCharts(projectId: string) {
  const chart = new ChartJSNodeCanvas({ width, height });
  // Datos demo: reemplazar por métricas reales
  const avance = await chart.renderToBuffer({
    type: 'line',
    data: {
      labels: ['Semana 1','Semana 2','Semana 3','Semana 4'],
      datasets: [{ label: 'Avance %', data: [10,35,62,80] }]
    }
  });

  const hallazgos = await chart.renderToBuffer({
    type: 'bar',
    data: {
      labels: ['Finanzas','Operaciones','TI'],
      datasets: [{ label: 'Hallazgos', data: [4,7,3] }]
    }
  });

  return { avance, hallazgos };
}

export async function generateProjectPdf(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Proyecto no encontrado');

  const { avance, hallazgos } = await buildCharts(projectId);
  const estado = STATUS_LABELS[project.status as EstadoProyectoType] ?? project.status;

  const fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-Italic.ttf'
    }
  } as any;

  const printer = new PdfPrinter(fonts);
  (printer as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? (pdfFonts as any).vfs;

  const docDef: TDocumentDefinitions = {
    info: {
      title: `Informe de Proyecto - ${project.name}`,
      author: 'Auditoría',
    },
    pageMargins: [40, 60, 40, 60],
    header: { text: `Informe - ${project.name}`, alignment: 'right', margin: [0, 10, 20, 0] },
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'Confidencial', style: 'footnote' },
        { text: `${currentPage} / ${pageCount}`, alignment: 'right', style: 'footnote' },
      ],
      margin: [40, 0, 40, 20]
    }),
    styles: {
      h1: { fontSize: 18, bold: true, margin: [0, 0, 0, 8] },
      h2: { fontSize: 14, bold: true, margin: [0, 14, 0, 6] },
      p: { fontSize: 10, margin: [0, 2, 0, 2] },
      footnote: { fontSize: 8, color: '#888' }
    },
    content: [
      { text: 'Resumen Ejecutivo', style: 'h1' },
      { text: `Estado actual: ${estado}`, style: 'p' },
      { text: 'Descripción general del proyecto…', style: 'p' },

      { text: 'Avance', style: 'h2' },
      { image: `data:image/png;base64,${avance.toString('base64')}`, width: 500, margin: [0,8,0,12] },

      { text: 'Hallazgos por categoría', style: 'h2' },
      { image: `data:image/png;base64,${hallazgos.toString('base64')}`, width: 500, margin: [0,8,0,12] },
    ]
  };

  // Construir PDF en memoria
  const pdfDoc = printer.createPdfKitDocument(docDef, { tableLayouts: {} } as any);
  const chunks: Buffer[] = [];
  return await new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on('data', (d) => chunks.push(d));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}
