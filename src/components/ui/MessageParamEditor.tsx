'use client';

import { useRef, useState, useEffect } from 'react';
import {
  Plus,
  RotateCcw,
  MessageSquare,
  User,
  Calendar,
  MapPin,
  Eye,
  ShieldCheck,
  Camera,
} from 'lucide-react';

interface MessageParamEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  onReset: () => void;
  variables: string[];
  label: string;
}

export function MessageParamEditor({
  value,
  onChange,
  onReset,
  variables,
  label,
}: MessageParamEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previewText, setPreviewText] = useState('');

  // 🎯 Simula a substituição de variáveis para o preview
  useEffect(() => {
    let text = value || '';
    // Substituições genéricas para o preview
    text = text.replace(/{galeria_titulo}/g, 'Ensaio Editorial Verão');
    text = text.replace(/{galeria_nome_cliente}/g, 'Mariana Silva');
    text = text.replace(/{galeria_data}/g, '25/01/2026');
    text = text.replace(/{galeria_local}/g, 'Estúdio Luz & Sombra');
    text = text.replace(/{url}/g, 'https://galeria.suafoto.com/mariana-verao');
    text = text.replace(/{usuario_nome}/g, 'John Doe');
    setPreviewText(text);
  }, [value]);

  const insertAtCursor = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const tag = `{${variable}}`;

    const newValue = value.substring(0, start) + tag + value.substring(end);

    onChange(newValue);

    // Reposiciona o cursor após a inserção
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-sans animate-in fade-in duration-500">
      {/* COLUNA DA ESQUERDA: EDITOR */}
      <div className="space-y-6">
        {/* Cabeçalho de Variáveis */}
        <div className="bg-slate-50 border border-petroleum/10 p-4 rounded-none">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold">
              Variáveis Disponíveis
            </span>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-[9px] font-bold text-red-500/70 hover:text-red-600 transition-colors uppercase"
            >
              <RotateCcw size={10} /> Resetar Padrão
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertAtCursor(v)}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-petroleum/10 text-[10px] text-petroleum hover:border-gold hover:text-gold transition-all active:scale-95 shadow-sm rounded-none"
              >
                <Plus size={10} /> {v}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-petroleum/40 italic mt-3">
            * Clique na variável para inserir na posição do cursor.
          </p>
        </div>

        {/* Área de Edição */}
        <div className="relative group">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Escreva sua mensagem..."
            className="w-full bg-white border border-petroleum/20 rounded-none p-4 text-[13px] min-h-[300px] font-mono leading-relaxed outline-none focus:border-gold transition-all custom-scrollbar"
          />
          <div className="absolute bottom-3 right-3 text-[9px] font-bold text-petroleum/30 uppercase tracking-tighter">
            {value.length} caracteres
          </div>
        </div>
      </div>

      {/* COLUNA DA DIREITA: PREVIEW ESTILO GALERIACARD */}
      <div className="space-y-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gold">
          Preview do Compartilhamento
        </span>

        {/* MOCKUP DO WHATSAPP / COMPARTILHAMENTO */}
        <div className="bg-[#E5DDD5] p-4 border border-petroleum/10 shadow-inner min-h-[400px] flex flex-col gap-4 overflow-hidden relative">
          {/* Balão de Mensagem */}
          <div className="bg-white p-3 rounded-lg shadow-sm max-w-[90%] self-start relative before:content-[''] before:absolute before:top-0 before:-left-2 before:w-0 before:h-0 before:border-t-[10px] before:border-t-white before:border-l-[10px] before:border-l-transparent">
            {/* O "CARD" estilo GaleriaCard dentro do WhatsApp */}
            <div className="flex flex-col overflow-hidden rounded-luxury border border-petroleum/20 bg-white mb-3 shadow-md">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-petroleum/90 flex items-center justify-center">
                <Camera className="text-gold/20 w-12 h-12" strokeWidth={1} />

                {/* Gradiente e Título igual ao GaleriaCard */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute top-2 left-2">
                  <span className="flex items-center justify-center w-6 h-6 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                    <ShieldCheck size={12} className="text-champagne" />
                  </span>
                </div>

                <div className="absolute top-2 right-2">
                  <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded-luxury text-[7px] text-white border border-white/20 uppercase">
                    Editorial
                  </span>
                </div>

                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="text-white text-[12px] truncate font-semibold italic">
                    Ensaio Editorial Verão
                  </h3>
                </div>
              </div>

              {/* Metadados igual ao GaleriaCard */}
              <div className="flex flex-col p-2 space-y-1 bg-white">
                <div className="flex items-center gap-1.5 text-[10px] text-editorial-gray">
                  <User size={10} className="text-editorial-gray shrink-0" />
                  <span className="font-semibold uppercase tracking-luxury truncate">
                    Mariana Silva
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-editorial-gray">
                  <span className="flex items-center gap-1">
                    <MapPin size={10} /> Estúdio Luz & Sombra
                  </span>
                  <span className="text-editorial-gray/40">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} /> 25/01/2026
                  </span>
                </div>
              </div>
            </div>

            {/* Texto da Mensagem Personalizada */}
            <div className="text-[12px] text-editorial-ink whitespace-pre-wrap leading-relaxed font-sans">
              {previewText || 'Sua mensagem aparecerá aqui...'}
            </div>
          </div>

          <p className="text-[9px] text-petroleum/40 text-center mt-auto">
            * Este é um preview ilustrativo do card no WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
