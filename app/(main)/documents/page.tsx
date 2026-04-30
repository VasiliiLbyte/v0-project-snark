import { Documents } from "@/components/pages/documents"
import { loadDocumentsData } from "@/lib/portal-data/loaders"

export default async function DocumentsPage() {
  const data = await loadDocumentsData()
  return <Documents data={data} />
}
