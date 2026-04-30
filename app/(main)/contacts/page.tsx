import { EmployeeDirectory } from "@/components/pages/employee-directory"
import { loadContactsData } from "@/lib/portal-data/loaders"

export default async function ContactsPage() {
  const data = await loadContactsData()
  return <EmployeeDirectory data={data} />
}
