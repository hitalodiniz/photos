// loading.tsx
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <LoadingScreen message="Carregando fotos" />
    </div>
  );
}
