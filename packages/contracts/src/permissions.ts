/** Keys consumed by current owning-domain policies. Job titles never imply these grants. */
export const PERMISSION_CATALOGUE = [
  { label: "People", permissions: [
    { key: "org.employee.read", label: "View managed employees" },
    { key: "org.employee.manage", label: "Manage reporting relationships" },
    { key: "employee.manage", label: "Employee oversight for delivery and evidence" },
  ] },
  { label: "Projects", permissions: [
    { key: "project.view", label: "View assigned projects" },
    { key: "project.manage", label: "Manage project delivery" },
    { key: "project.plan_complete", label: "Complete project plan items" },
    { key: "project.gate_override", label: "Override project completion gates with a reason" },
    { key: "project.scope_request", label: "Request project scope changes" },
    { key: "project.scope_decide", label: "Decide scope changes as the named approver" },
    { key: "project.cancellation_request", label: "Request project cancellation" },
    { key: "project.closeout_approve", label: "Approve scoped closeout work" },
  ] },
  { label: "Templates", permissions: [
    { key: "template.view", label: "View project templates" },
    { key: "template.manage", label: "Manage project templates" },
  ] },
  { label: "Tasks and reviews", permissions: [
    { key: "task.assign", label: "Assign tasks within current scope" },
    { key: "task.deadline_change", label: "Change committed task deadlines" },
    { key: "review.decide", label: "Decide assigned internal reviews" },
  ] },
  { label: "Documents", permissions: [
    { key: "document.view", label: "View permitted project documents" },
    { key: "document.upload", label: "Upload project documents" },
    { key: "document.manage", label: "Manage document revisions" },
    { key: "document.issue", label: "Issue approved document revisions" },
    { key: "document.client_review_select", label: "Select revisions for client review" },
  ] },
  { label: "Client and external workflows", permissions: [
    { key: "client.review_manage", label: "Manage client review packages" },
    { key: "client.revision_classify", label: "Classify client revision requests" },
    { key: "client.correction_assign", label: "Assign client correction work" },
    { key: "external.manage", label: "Manage scoped external portal access" },
  ] },
  { label: "Leads", permissions: [
    { key: "lead.view", label: "View leads" },
    { key: "lead.create", label: "Create leads" },
    { key: "lead.edit", label: "Edit leads" },
    { key: "lead.activity_create", label: "Record lead activity" },
    { key: "lead.stage_change", label: "Change lead stages with a reason" },
    { key: "crm_source.manage", label: "Manage lead sources" },
  ] },
  { label: "Time and workforce", permissions: [
    { key: "time.manage", label: "Manage scoped time records" },
    { key: "workforce.manage", label: "Manage scoped workforce records" },
  ] },
  { label: "Skills and training", permissions: [
    { key: "skills.view", label: "View scoped skill profiles" },
    { key: "skills.manage", label: "Manage scoped skill changes" },
    { key: "training.view", label: "View permitted training" },
    { key: "training.manage", label: "Manage scoped training" },
  ] },
  { label: "Knowledge library", permissions: [
    { key: "library.view", label: "View permitted library content" },
    { key: "library.manage", label: "Manage scoped library content" },
  ] },
  { label: "Performance, reports and automation", permissions: [
    { key: "performance.view", label: "View permitted performance evidence" },
    { key: "performance.manage", label: "Manage scoped performance workflows" },
    { key: "report.manage", label: "Manage personal saved reports within current scope" },
    { key: "automation.manage", label: "Manage permitted automation rules" },
  ] },
  { label: "Turnkey delivery", permissions: [
    { key: "turnkey.view", label: "View permitted Turnkey delivery" },
    { key: "turnkey.manage", label: "Manage Turnkey delivery" },
    { key: "turnkey.cost_view", label: "View protected Turnkey costs" },
    { key: "turnkey.cost_approve", label: "Decide costs as the named approver" },
    { key: "turnkey.procurement_approve", label: "Decide procurement as the named approver" },
  ] },
  { label: "Site delivery", permissions: [
    { key: "site.view", label: "View assigned site delivery" },
    { key: "site.work", label: "Submit permitted site work" },
    { key: "site.manage", label: "Manage scoped site delivery" },
  ] },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOGUE)[number]["permissions"][number]["key"];
const supportedKeys: ReadonlySet<string> = new Set(PERMISSION_CATALOGUE.flatMap(group => group.permissions.map(permission => permission.key)));

/** Validates new configuration only; existing grant history and evaluation stay intact. */
export function isKnownPermissionKey(value: string): value is PermissionKey {
  return supportedKeys.has(value);
}
