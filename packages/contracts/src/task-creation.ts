/** Presentation choices only. Every task command independently reauthorizes. */
export type TaskCreationPerson = { id: string; name: string; homeBranchId: string };
export type TaskCreationOptions = {
  actorEmployeeId: string | null;
  project: { id: string; title: string; status: string } | null;
  canAssign: boolean;
  canCreate: boolean;
  owners: TaskCreationPerson[];
  collaborators: TaskCreationPerson[];
  readAt: string;
};
