export const ALLOWED_SQUADS = ["138", "139", "183"] as const;
export type Squad = (typeof ALLOWED_SQUADS)[number];

export function isAllowedSquad(value: unknown): value is Squad {
  return typeof value === "string" && (ALLOWED_SQUADS as readonly string[]).includes(value);
}
