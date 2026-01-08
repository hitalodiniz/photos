// src/app/subdomain/[username]/photo/[googleId]/page.tsx
import PhotoPage from '@/app/(public)/photo/[googleId]/page';

export default async function Page(props: any) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  // Se o searchParams vier vazio por causa do bug do rewrite,
  // tentamos pegar o 's' que pode estar perdido no objeto props
  const slugFromSearch = searchParams?.s;

  // Criamos um novo objeto de searchParams garantindo que o 's' esteja lá
  const forcedSearchParams = {
    ...searchParams,
    s: slugFromSearch,
  };

  return (
    <PhotoPage
      params={Promise.resolve(params)}
      searchParams={Promise.resolve(forcedSearchParams)}
    />
  );
}
