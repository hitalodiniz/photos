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
  const rows = data.map(obj => 
    Object.values(obj).map(val => `"${val}"`).join(',')
  ).join('\n');
  
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
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

/**
 * Exporta dados para PDF
 */
export const exportToPDF = (data: any[], filename: string, title: string) => {
  const doc = new jsPDF();
  
  // Adiciona título
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  
  // Adiciona data do relatório
  const date = new Date().toLocaleDateString('pt-BR');
  doc.text(`Relatório gerado em: ${date}`, 14, 30);
  doc.text(
    `Gerado pelo aplicativo ${process.env.NEXT_PUBLIC_MAIN_DOMAIN || ''}`,
    14,
    35
  );
  
  if (data.length > 0) {
    const headers = [Object.keys(data[0])];
    const body = data.map(obj => Object.values(obj));
    
    autoTable(doc, {
      head: headers,
      body: body,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [0, 33, 46] }, // Cor petroleum
    });
  } else {
    doc.text('Nenhum lead encontrado.', 14, 40);
  }
  
  doc.save(`${filename}.pdf`);
};
