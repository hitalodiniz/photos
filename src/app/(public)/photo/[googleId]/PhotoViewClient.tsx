'use client';
import { Lightbox } from '@/components/galeria';
import { useRouter } from 'next/navigation';

export default function PhotoViewClient({ googleId, slug, initialData }: any) {
  const router = useRouter();

  const singlePhotoArray = [{ id: googleId }];
  const handleClose = () => router.push(`/${slug}`);

  return (
    <Lightbox
      photos={singlePhotoArray}
      activeIndex={0}
      totalPhotos={1}
      galleryTitle={initialData?.title}
      location={initialData?.location}
      galeria={initialData}
      onClose={handleClose}
      onNext={() => {}}
      onPrev={() => {}}
      favorites={[]}
      onToggleFavorite={() => {}}
      isSingleView={true}
    />
  );
}
