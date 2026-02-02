'use client';
import { useState } from 'react';
import FormPageBase from '@/components/ui/FormPageBase';
import {
  Settings,
  Layout,
  MessageSquare,
  Tags,
  Eye,
  EyeOff,
  Database,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import { GALLERY_CATEGORIES } from '@/core/config/categories';
import { upsertProfile } from '@/core/services/profile.service';

const FormSection = ({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-luxury border border-petroleum/40 p-4 space-y-3">
    <div className="flex flex-col gap-1 pb-2 border-b border-petroleum/40">
      <div className="flex items-center gap-2">
        {icon && <div className="text-gold">{icon}</div>}
        <h3 className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] text-petroleum italic font-semibold">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    <div>{children}</div>
  </div>
);

export default function PreferenciasPage({ profile, onClose }) {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Estados Locais de Configuração
  const [hiddenCats, setHiddenCats] = useState<string[]>(
    profile?.hidden_system_categories || [],
  );
  const [defaultDesign, setDefaultDesign] = useState(
    profile?.default_gallery_config || {
      show_cover_in_grid: false,
      grid_bg_color: '#FFFFFF',
      columns: { mobile: 2, tablet: 3, desktop: 4 },
    },
  );
  const [waMessages, setWaMessages] = useState(
    profile?.whatsapp_messages || {
      gallery_delivery: '',
      lead_contact: '',
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    // Adicionamos os JSONs como strings para a action processar
    formData.append('default_gallery_config', JSON.stringify(defaultDesign));
    formData.append('whatsapp_messages', JSON.stringify(waMessages));
    formData.append('hidden_system_categories', JSON.stringify(hiddenCats));

    // Reaproveita sua action de upsertProfile (ajustar na action para receber estes campos)
    const res = await upsertProfile(formData);

    if (res.success) {
      setIsSuccess(true);
      setHasChanges(false);
      setTimeout(() => setIsSuccess(false), 2000);
    }
    setLoading(true);
  };

  return (
    <FormPageBase
      title="preferências gerais"
      isEdit={true}
      loading={loading}
      isSuccess={isSuccess}
      hasUnsavedChanges={hasChanges}
      onClose={onClose}
      onSubmit={handleSubmit}
      onFormChange={() => setHasChanges(true)}
    >
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* SEÇÃO: CATEGORIAS DO SISTEMA */}
        <FormSection
          title="visibilidade de categorias"
          subtitle="oculte categorias que você não utiliza no seu dia a dia"
          icon={<Tags size={14} />}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {GALLERY_CATEGORIES.map((cat) => {
              const isHidden = hiddenCats.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setHiddenCats((prev) =>
                      isHidden
                        ? prev.filter((id) => id !== cat.id)
                        : [...prev, cat.id],
                    );
                    setHasChanges(true);
                  }}
                  className={`flex items-center justify-between p-3 rounded-luxury border transition-all ${
                    isHidden
                      ? 'bg-slate-50 border-petroleum/10 opacity-50'
                      : 'bg-white border-petroleum/30 shadow-sm'
                  }`}
                >
                  <span className="text-[11px] font-bold text-petroleum uppercase tracking-wider">
                    {cat.label}
                  </span>
                  {isHidden ? (
                    <EyeOff size={12} className="text-red-400" />
                  ) : (
                    <Eye size={12} className="text-gold" />
                  )}
                </button>
              );
            })}
          </div>
        </FormSection>

        {/* SEÇÃO: DESIGN PADRÃO */}
        <FormSection
          title="design padrão das galerias"
          subtitle="estas configurações serão aplicadas automaticamente em novas galerias"
          icon={<Layout size={14} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-luxury border border-petroleum/10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
                  foto de fundo ativa
                </p>
                <p className="text-[9px] text-petroleum/50 italic">
                  exibir capa como background do grid
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDefaultDesign({
                    ...defaultDesign,
                    show_cover_in_grid: !defaultDesign.show_cover_in_grid,
                  })
                }
                className={`relative h-5 w-9 rounded-full transition-colors ${defaultDesign.show_cover_in_grid ? 'bg-gold' : 'bg-slate-200'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${defaultDesign.show_cover_in_grid ? 'translate-x-4' : ''}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-luxury border border-petroleum/10">
              <p className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
                cor de fundo do grid
              </p>
              <input
                type="color"
                value={defaultDesign.grid_bg_color}
                onChange={(e) =>
                  setDefaultDesign({
                    ...defaultDesign,
                    grid_bg_color: e.target.value,
                  })
                }
                className="w-8 h-8 rounded-md cursor-pointer border-none"
              />
            </div>
          </div>
        </FormSection>

        {/* SEÇÃO: MENSAGENS WHATSAPP */}
        <FormSection
          title="comunicação whatsapp"
          subtitle="personalize os textos que serão enviados aos seus clientes"
          icon={<MessageSquare size={14} />}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-luxury-widest text-petroleum">
                mensagem de entrega da galeria
              </label>
              <textarea
                value={waMessages.gallery_delivery}
                onChange={(e) =>
                  setWaMessages({
                    ...waMessages,
                    gallery_delivery: e.target.value,
                  })
                }
                className="w-full p-4 bg-white border border-petroleum/20 rounded-luxury text-[13px] text-petroleum outline-none focus:border-gold min-h-[100px] resize-none"
                placeholder="olá! suas fotos estão prontas..."
              />
              <p className="text-[9px] text-gold font-bold italic">
                use {'{{link}}'} para inserir o link da galeria automaticamente.
              </p>
            </div>
          </div>
        </FormSection>
      </div>
    </FormPageBase>
  );
}
