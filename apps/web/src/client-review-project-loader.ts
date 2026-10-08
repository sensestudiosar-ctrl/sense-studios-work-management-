type ProjectPage<Project> = { items: Project[] };

export async function loadBranchProjects<Project>(
  branches: readonly { id: string }[],
  listPage: (branchId: string, offset: number, limit: 50) => Promise<ProjectPage<Project>>,
  shouldContinue: () => boolean = () => true,
): Promise<Project[]> {
  const results: Project[][] = new Array(branches.length);
  let nextBranch = 0;
  let failed = false;
  let failure: unknown;

  const worker = async (): Promise<void> => {
    while (!failed && shouldContinue()) {
      const branchIndex = nextBranch++;
      if (branchIndex >= branches.length) return;
      const branch = branches[branchIndex];
      if (!branch) return;

      const items: Project[] = [];
      try {
        for (let offset = 0; offset <= 100_000; offset += 50) {
          if (failed || !shouldContinue()) return;
          const page = await listPage(branch.id, offset, 50);
          items.push(...page.items);
          if (page.items.length < 50) break;
        }
        results[branchIndex] = items;
      } catch (cause) {
        if (!failed) {
          failed = true;
          failure = cause;
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, branches.length) }, () => worker()));
  if (failed) throw failure;
  return results.flat();
}
