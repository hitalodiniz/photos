import PhotographerProfileBase from '@/components/profile/ProfileBase';

export default async function ClassicPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <PhotographerProfileBase username={username} isSubdomainContext={false} />
  );
}
