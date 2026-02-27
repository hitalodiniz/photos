import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import GaleriaFormContent from './GaleriaFormContent';
import { PlanProvider } from '@/core/context/PlanContext';

// --- MOCKS DE INFRAESTRUTURA ---

vi.mock('@photos/core-auth', () => ({
  useSupabaseSession: vi.fn(() => ({
    getAuthDetails: vi.fn().mockResolvedValue({ userId: 'user_123' }),
  })),
  authService: {
    getUser: vi.fn(),
  },
}));

vi.mock('@/actions/google.actions', () => ({
  getParentFolderIdServer: vi.fn(),
  getDriveFolderName: vi.fn(),
  checkFolderPublicPermission: vi.fn(),
  checkFolderLimits: vi.fn(),
}));

vi.mock('@/components/google-drive', () => ({
  GooglePickerButton: ({ onFolderSelect }: any) => (
    <button
      onClick={() =>
        onFolderSelect([
          {
            id: 'folder_123',
            name: 'Folder Name',
            mimeType: 'application/vnd.google-apps.folder',
          },
        ])
      }
    >
      Selecionar Pasta
    </button>
  ),
}));

vi.mock('@/components/galeria', () => ({
  CategorySelect: ({ value, onChange }: any) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid="category-select"
    >
      <option value="evento">Evento</option>
      <option value="ensaio">Ensaio</option>
    </select>
  ),
}));

vi.mock('@/hooks/useGoogleDriveImage', () => ({
  useGoogleDriveImage: () => ({ imgSrc: 'mock-url' }),
}));

// --- WRAPPER DE CONTEXTO ---

const GaleriaFormContentWrapper = (props: any) => {
  const methods = useForm({
    defaultValues: {
      leads_enabled:
        props.profile?.settings?.defaults?.enable_guest_registration ?? false,
      lead_purpose:
        props.initialData?.lead_purpose ||
        props.profile?.settings?.defaults?.data_treatment_purpose ||
        '',
      is_public: props.initialData?.is_public ?? true,
      show_on_profile: props.initialData?.show_on_profile ?? false,
      enable_favorites: props.initialData?.enable_favorites ?? true,
      enable_slideshow: props.initialData?.enable_slideshow ?? true,
    },
  });

  return (
    <PlanProvider profile={props.profile}>
      <GaleriaFormContent
        {...props}
        register={methods.register}
        setValue={methods.setValue}
        watch={methods.watch}
      />
    </PlanProvider>
  );
};

// --- TESTES ---

describe('GaleriaFormContent', () => {
  const defaultProps = {
    customization: {
      showCoverInGrid: true,
      gridBgColor: '#F3E5AB',
      columns: { mobile: 2, tablet: 3, desktop: 4 },
    },
    setCustomization: {
      setShowCoverInGrid: vi.fn(),
      setGridBgColor: vi.fn(),
      setColumns: vi.fn(),
    },
    onPickerError: vi.fn(),
    onTokenExpired: vi.fn(),
    onTitleChange: vi.fn(),
    profile: {
      plan_key: 'PRO',
      settings: {
        display: { show_contract_type: true },
        defaults: {
          list_on_profile: false,
          enable_guest_registration: false,
          required_guest_fields: ['name', 'whatsapp'],
          data_treatment_purpose: '',
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<GaleriaFormContentWrapper {...defaultProps} />);

    expect(screen.getByText(/Modalidade/i)).toBeInTheDocument();
    expect(screen.getByText(/Galeria & Sincronização/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacidade/i)).toBeInTheDocument();
  });

  it('handles various lead capture field combinations', async () => {
    render(<GaleriaFormContentWrapper {...defaultProps} />);

    // Procure pelo label ou pelo input real se o texto estiver em um span
    const leadsToggle = screen.getByRole('button', {
      name: /Habilitar cadastro de visitante/i,
    });
    fireEvent.click(leadsToggle);
  });

  describe('Drive Selection Integration', () => {
    it('handles drive selection correctly and updates hidden inputs', async () => {
      const googleActions = await import('@/actions/google.actions');

      vi.mocked(googleActions.getParentFolderIdServer).mockResolvedValue(
        'parent_123',
      );
      vi.mocked(googleActions.getDriveFolderName).mockResolvedValue(
        'Folder Name',
      );
      vi.mocked(googleActions.checkFolderPublicPermission).mockResolvedValue({
        isPublic: true,
        isOwner: true,
        folderLink: 'link',
      } as any);
      vi.mocked(googleActions.checkFolderLimits).mockResolvedValue({
        count: 10,
        hasMore: false,
        totalInDrive: 10,
      });

      render(<GaleriaFormContentWrapper {...defaultProps} />);

      const selectButton = screen.getByText(/Selecionar Pasta/i);
      fireEvent.click(selectButton);

      await waitFor(
        () => {
          const input = document.querySelector(
            'input[name="drive_folder_name"]',
          ) as HTMLInputElement;
          expect(input.value).toBe('Folder Name');
        },
        { timeout: 3000 },
      );
    });
  });
});
