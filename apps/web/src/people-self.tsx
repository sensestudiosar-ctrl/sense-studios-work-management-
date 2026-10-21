import { useEffect, useState } from "react";

type Profile = { employee: null | {
  id: string; state: string; employeeCode: string | null; hiredAt: string;
  homeBranch: { id: string; name: string }; homeTeam: { id: string; name: string };
  reportsTo: { id: string; account: { normalizedEmail: string } } | null;
  jobRoleAssignments: Array<{ jobRole: { id: string; name: string } }>;
} };

export function PeopleSelf(): React.JSX.Element {
  const [profile, setProfile] = useState<Profile>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setProfile(undefined);
    void (async () => {
      try {
        const response = await fetch("/api/v1/org/self", { credentials: "include", cache: "no-store" });
        if (!active) return;
        if (response.status === 401) { window.dispatchEvent(new Event("sense-session-ended")); return; }
        if (!response.ok) { setError(response.status === 403 ? "Your current membership is unavailable. Ask the Owner to review your access." : "Your employee profile could not be loaded. Try again."); return; }
        const value = await response.json() as Profile;
        if (active) setProfile(value);
      } catch { if (active) setError("Your employee profile could not be loaded. Try again."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [retry]);
  return <section className="identity-section" aria-labelledby="my-employee-profile"><h2 id="my-employee-profile">My employee profile</h2>
    {loading && <p role="status">Loading your membership…</p>}
    {error && <><p role="alert">{error}</p><button type="button" className="secondary-action" onClick={() => setRetry(value => value + 1)}>Retry profile</button></>}
    {profile?.employee === null && <p>Your staff identity is enrolled. The Owner still needs to configure your employee record and home membership before you can receive employee work.</p>}
    {profile?.employee && <dl className="people-self-details"><div><dt>Employee code</dt><dd>{profile.employee.employeeCode ?? "Not assigned"}</dd></div><div><dt>Home branch</dt><dd>{profile.employee.homeBranch.name}</dd></div><div><dt>Home team</dt><dd>{profile.employee.homeTeam.name}</dd></div><div><dt>Reports to</dt><dd>{profile.employee.reportsTo?.account.normalizedEmail ?? "No reporting manager"}</dd></div><div><dt>Job roles</dt><dd>{profile.employee.jobRoleAssignments.map(item => item.jobRole.name).join(", ") || "No job roles assigned"}</dd></div></dl>}
  </section>;
}
