import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exporta dados para CSV
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]).join(',');
  const rows = data
    .map((obj) =>
      Object.values(obj)
        .map((val) => `"${val}"`)
        .join(','),
    )
    .join('\n');

  const csvContent = `${headers}\n${rows}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

/**
 * Exporta dados para Excel
 */
export const exportToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `${filename}.xlsx`);
};

/**
 * Exporta dados para PDF
 */
export const exportToPDF = (data: any[], filename: string, title: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // 1. Ajuste do Título Principal com quebra de linha automática
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40); // Cinza grafite neutro e elegante

  // Divide o título em linhas para não ultrapassar a largura da página
  const splitTitle = doc.splitTextToSize(title, pageWidth - margin * 2);
  doc.text(splitTitle, margin, 22);

  // Calcula a posição Y atual com base no número de linhas do título
  // Cada linha de fonte 18 ocupa aproximadamente 8 unidades de altura
  const titleHeight = splitTitle.length * 8;
  let currentY = 22 + titleHeight;

  // 2. Informações de Geração (Subtítulo)
  doc.setFontSize(10);
  doc.setTextColor(100);
  const date = new Date().toLocaleDateString('pt-BR');

  doc.text(`Relatório gerado em: ${date}`, margin, currentY);
  currentY += 4; // Espaçamento entre linhas

  doc.text(
    `Gerado pelo aplicativo ${process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'}`,
    margin,
    currentY,
  );

  currentY += 4; // Espaçamento antes da tabela

  // 3. Renderização da Tabela
  if (data.length > 0) {
    const headers = [Object.keys(data[0])];
    const body = data.map((obj) => Object.values(obj));

    autoTable(doc, {
      head: headers,
      body: body,
      startY: currentY, // Começa dinamicamente após os textos
      theme: 'grid',
      headStyles: {
        fillColor: [40, 40, 40], // Cinza grafite neutro e elegante
        fontSize: 10,
        fontStyle: 'bold',
      },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });
  } else {
    doc.text('Nenhum cadastro de visitante encontrado.', margin, currentY);
  }

  doc.save(`${filename}.pdf`);
};
