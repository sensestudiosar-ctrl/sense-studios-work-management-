export type TaskCreationVariant = "OWNER" | "EMPLOYEE" | "LEADER" | "SITE";
export type TaskCreationResolution = "ACCOUNT_KIND" | "CONFIGURED_ROLE" | "GENERIC_FALLBACK" | "AMBIGUOUS";
export type TaskCreationProfile = { version: 1; variant: TaskCreationVariant; resolution: TaskCreationResolution };

const configuredVariants = new Set<TaskCreationVariant>(["EMPLOYEE", "LEADER", "SITE"]);

/** Resolve only presentation identity; this value grants no task or organization capability. */
export function resolveTaskCreationProfile(accountKind: "OWNER" | "STAFF", presentations: readonly (string | null)[] = []): TaskCreationProfile {
  if (accountKind === "OWNER") return { version: 1, variant: "OWNER", resolution: "ACCOUNT_KIND" };

  const distinct = new Set<string>();
  let invalid = false;
  for (const presentation of presentations) {
    if (presentation === null) continue;
    if (!configuredVariants.has(presentation as TaskCreationVariant)) invalid = true;
    distinct.add(presentation);
  }
  if (invalid || distinct.size > 1) return { version: 1, variant: "EMPLOYEE", resolution: "AMBIGUOUS" };
  const [variant] = distinct;
  return variant
    ? { version: 1, variant: variant as TaskCreationVariant, resolution: "CONFIGURED_ROLE" }
    : { version: 1, variant: "EMPLOYEE", resolution: "GENERIC_FALLBACK" };
}
