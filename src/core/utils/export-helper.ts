import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper para tratar dados complexos antes da exportação
const formatDataForExport = (data: any[]) => {
  return data.map((item) => ({
    Data: new Date(item.created_at).toLocaleString('pt-BR'),
    Evento: item.event_label || item.event_type,
    Localização: item.location || 'N/A',
    Dispositivo: item.device_info?.type || 'N/A',
    OS: item.device_info?.os || 'N/A',
    ID_Visitante: item.visitor_id,
  }));
};

/**
 * Exporta para CSV com tratamento de BOM para acentuação no Excel
 */
export const exportToCSV = (rawData: any[], filename: string) => {
  const data = formatDataForExport(rawData);
  if (data.length === 0) return;

  const headers = Object.keys(data[0]).join(',');
  const rows = data
    .map((obj) =>
      Object.values(obj)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');

  const csvContent = `\uFEFF${headers}\n${rows}`; // \uFEFF garante acentos no Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

/**
 * Exporta para Excel (XLSX)
 */
export const exportToExcel = (rawData: any[], filename: string) => {
  const data = formatDataForExport(rawData);
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `${filename}.xlsx`);
};

/**
 * Exporta para PDF com layout otimizado
 */
export const exportToPDF = (
  rawData: any[],
  filename: string,
  title: string,
) => {
  const data = formatDataForExport(rawData);
  const doc = new jsPDF('l', 'mm', 'a4'); // 'l' para modo Paisagem (Landscape)
  const margin = 14;

  doc.setFontSize(16);
  doc.setTextColor(26, 46, 53); // Cor Petroleum
  doc.text(title, margin, 20);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, 28);

  if (data.length > 0) {
    autoTable(doc, {
      head: [Object.keys(data[0])],
      body: data.map((obj) => Object.values(obj)),
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [26, 46, 53], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 35 }, // Data
        2: { cellWidth: 'auto' }, // Localização (flexível)
      },
    });
  }

  doc.save(`${filename}.pdf`);
};
