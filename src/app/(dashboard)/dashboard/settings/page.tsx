import { getProfileData } from '@/core/services/profile.service'
import SettingsForm from './SettingsForm'
import { redirect } from 'next/navigation'
import { PlanProvider } from '@/core/context/PlanContext'

export const metadata = {
  title: 'Preferências | Photos',
}

export default async function SettingsPage() {
  const result = await getProfileData()

  if (!result.success || !result.profile) {
    redirect('/auth/login')
  }

  return (
    <PlanProvider profile={result.profile}>
      <SettingsForm profile={result.profile} />
    </PlanProvider>
  )
}
