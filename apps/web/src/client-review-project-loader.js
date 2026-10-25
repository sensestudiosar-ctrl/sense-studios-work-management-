export async function loadBranchProjects(branches, listPage, shouldContinue = () => true) {
    const results = new Array(branches.length);
    let nextBranch = 0;
    let failed = false;
    let failure;
    const worker = async () => {
        while (!failed && shouldContinue()) {
            const branchIndex = nextBranch++;
            if (branchIndex >= branches.length)
                return;
            const branch = branches[branchIndex];
            if (!branch)
                return;
            const items = [];
            try {
                for (let offset = 0; offset <= 100_000; offset += 50) {
                    if (failed || !shouldContinue())
                        return;
                    const page = await listPage(branch.id, offset, 50);
                    items.push(...page.items);
                    if (page.items.length < 50)
                        break;
                }
                results[branchIndex] = items;
            }
            catch (cause) {
                if (!failed) {
                    failed = true;
                    failure = cause;
                }
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(4, branches.length) }, () => worker()));
    if (failed)
        throw failure;
    return results.flat();
}
