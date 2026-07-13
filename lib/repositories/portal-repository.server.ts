import "server-only"
import { isMockDb } from "@/lib/config/mode"
import type { PortalRepository } from "@/lib/repositories/portal-repository.types"
import { drizzlePortalRepository } from "@/lib/repositories/portal-repository.drizzle"
import { mockPortalRepository } from "@/lib/repositories/portal-repository.mock"

export function getPortalRepositoryServer(): PortalRepository {
  return isMockDb() ? mockPortalRepository : drizzlePortalRepository
}
