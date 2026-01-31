import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import GaleriaFormContent from './GaleriaFormContent';
import { PERMISSIONS_BY_PLAN as mockPermissionsByPlan } from '@/core/config/plans';

// Wrapper component to provide useForm context
const GaleriaFormContentWrapper = (props: any) => {
  const { register, setValue, watch } = useForm({
    defaultValues: {
      leads_enabled: props.profile?.settings?.defaults?.enable_guest_registration ?? false,
      lead_purpose: props.initialData?.lead_purpose || props.profile?.settings?.defaults?.data_treatment_purpose || '',
    }
  });

  return (
    <GaleriaFormContent
      {...props}
      register={register}
      setValue={setValue}
      watch={watch}
    />
  );
};

// Mock dependencies
vi.mock('@photos/core-auth', () => ({
  useSupabaseSession: vi.fn(() => ({
    getAuthDetails: vi.fn().mockResolvedValue({ userId: 'user_123' }),
  })),
}));

vi.mock('@/actions/google.actions', () => ({
  getParentFolderIdServer: vi.fn(),
  getDriveFolderName: vi.fn(),
  checkFolderPublicPermission: vi.fn(),
  checkFolderLimits: vi.fn(),
}));

vi.mock('@/components/google-drive', () => ({
  GooglePickerButton: ({ onFolderSelect }: any) => (
    <button onClick={() => onFolderSelect('folder_123', 'Folder Name')}>
      Select Folder
    </button>
  ),
}));

vi.mock('@/components/galeria', () => ({
  CategorySelect: ({ value, onChange }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid="category-select">
      <option value="evento">Evento</option>
      <option value="ensaio">Ensaio</option>
    </select>
  ),
}));

vi.mock('@/hooks/useGoogleDriveImage', () => ({
  useGoogleDriveImage: () => ({ imgSrc: 'mock-url' }),
}));

vi.mock('@/hooks/usePlan', () => ({
  usePlan: (planKey?: string) => {
    const key = (planKey?.toUpperCase() || 'PRO') as any;
    return {
      permissions: mockPermissionsByPlan[key] || mockPermissionsByPlan.FREE,
      canAddMore: vi.fn().mockReturnValue(true),
      isPremium: key === 'PREMIUM',
      isPro: ['PRO', 'PREMIUM'].includes(key),
    };
  },
}));

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
        }
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<GaleriaFormContentWrapper {...defaultProps} />);

    expect(screen.getByText(/Identificação/i)).toBeInTheDocument();
    expect(screen.getByText(/Galeria & Sincronização/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacidade/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cadastro de visitante/i).length).toBeGreaterThan(0);
  });

  it('hides Identificação section when show_contract_type is false', () => {
    const propsWithHiddenContract = {
      ...defaultProps,
      profile: {
        ...defaultProps.profile,
        settings: {
          ...defaultProps.profile.settings,
          display: { show_contract_type: false }
        }
      }
    };

    render(<GaleriaFormContentWrapper {...propsWithHiddenContract} />);

    expect(screen.queryByText(/Identificação/i)).not.toBeInTheDocument();
  });

  it('handles various lead capture field combinations and enforces at least one mandatory field', async () => {
    render(<GaleriaFormContentWrapper {...defaultProps} />);

    // Enable leads
    const leadsToggle = screen.getByText(/Habilitar cadastro de visitante para visualizar a galeria/i).nextElementSibling as HTMLElement;
    fireEvent.click(leadsToggle);

    const getHiddenInputValue = (testId: string) => {
      const input = screen.getByTestId(testId) as HTMLInputElement;
      return input?.value;
    };

    // Wait for the lead capture fields to appear
    await waitFor(() => {
      expect(screen.getByText('Exigir Nome')).toBeInTheDocument();
    });

    // Default state: Name and WhatsApp required, Email not required
    expect(getHiddenInputValue('leads_require_name')).toBe('true');
    expect(getHiddenInputValue('leads_require_whatsapp')).toBe('true');
    expect(getHiddenInputValue('leads_require_email')).toBe('false');

    const requireNameCheckbox = screen.getByText('Exigir Nome').parentElement as HTMLElement;
    const requireEmailCheckbox = screen.getByText('Exigir E-mail').parentElement as HTMLElement;
    const requireWhatsappCheckbox = screen.getByText('Exigir WhatsApp').parentElement as HTMLElement;

    // Test 1: Try to disable all fields (should fail, at least one remains)
    fireEvent.click(requireNameCheckbox); // Name=F, WhatsApp=T, Email=F

    await waitFor(() => {
      expect(getHiddenInputValue('leads_require_name')).toBe('false');
    });
    expect(getHiddenInputValue('leads_require_whatsapp')).toBe('true');

    fireEvent.click(requireWhatsappCheckbox); // Try to make all F. Should keep WhatsApp=T

    // We expect it to remain true because it was the last one active
    await waitFor(() => {
      expect(getHiddenInputValue('leads_require_whatsapp')).toBe('true');
    });

    // Test 2: Enable Email, then disable WhatsApp
    fireEvent.click(requireEmailCheckbox); // Name=F, WhatsApp=T, Email=T
    await waitFor(() => {
      expect(getHiddenInputValue('leads_require_email')).toBe('true');
    });

    fireEvent.click(requireWhatsappCheckbox); // Name=F, WhatsApp=F, Email=T (allowed because Email is T)
    await waitFor(() => {
      expect(getHiddenInputValue('leads_require_whatsapp')).toBe('false');
    });

    // Test 3: Try to disable Email (last one)
    fireEvent.click(requireEmailCheckbox); // Should remain T
    await waitFor(() => {
      expect(getHiddenInputValue('leads_require_email')).toBe('true');
    });

    // Test 4: Enable Name, then disable Email
    fireEvent.click(requireNameCheckbox); // Name=T, WhatsApp=F, Email=T
    fireEvent.click(requireEmailCheckbox); // Name=T, WhatsApp=F, Email=F
    await waitFor(() => {
      expect(getHiddenInputValue('leads_require_name')).toBe('true');
      expect(getHiddenInputValue('leads_require_email')).toBe('false');
    });
  });

  it('handles drive selection correctly', async () => {
    const { getParentFolderIdServer, getDriveFolderName, checkFolderPublicPermission, checkFolderLimits } = await import('@/actions/google.actions');

    vi.mocked(getParentFolderIdServer).mockResolvedValue('parent_123');
    vi.mocked(getDriveFolderName).mockResolvedValue('Folder Name');
    vi.mocked(checkFolderPublicPermission).mockResolvedValue({ isPublic: true, isOwner: true, folderLink: 'link' });
    vi.mocked(checkFolderLimits).mockResolvedValue({ count: 10, hasMore: false, totalInDrive: 10 });

    render(<GaleriaFormContentWrapper {...defaultProps} />);

    const selectButton = screen.getByText('Select Folder');
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('Folder Name')).toBeInTheDocument();
    });
  });
});
