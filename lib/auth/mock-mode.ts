export function useMockAuth(): boolean {
  return process.env.USE_MOCK_DB !== "false"
}
