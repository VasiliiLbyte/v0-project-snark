import "server-only"
import { getPortalRepository } from "@/lib/repositories/portal-repository"
import type { ContactsData, DashboardData, DocumentsData, ProfileData, SidebarItem } from "@/types/portal"

export async function loadDashboardData(): Promise<DashboardData> {
  return getPortalRepository().getDashboardData()
}

export async function loadContactsData(): Promise<ContactsData> {
  return getPortalRepository().getContactsData()
}

export async function loadDocumentsData(): Promise<DocumentsData> {
  return getPortalRepository().getDocumentsData()
}

export async function loadProfileData(): Promise<ProfileData> {
  return getPortalRepository().getProfileData()
}

export async function loadSidebarItems(): Promise<SidebarItem[]> {
  return getPortalRepository().getSidebarItems()
}
