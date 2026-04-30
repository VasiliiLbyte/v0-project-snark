import { Profile } from "@/components/pages/profile"
import { loadProfileData } from "@/lib/portal-data/loaders"

export default async function ProfilePage() {
  const data = await loadProfileData()
  return <Profile data={data} />
}
