import React from 'react';

import PhotographerProfileContainer from '@/components/profile/PhotographerProfileContainer';

export default function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = React.use(params);
  return <PhotographerProfileContainer username={resolvedParams.username} />;
}
