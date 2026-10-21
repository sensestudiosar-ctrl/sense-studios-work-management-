import { useId, useState, type ReactNode } from "react";
import "./auth-flow.css";

export function AuthFrame({ audience, title, intro, children, brand = true, wide = false }: {
  audience: string; title: string; intro?: string; children: ReactNode; brand?: boolean; wide?: boolean;
}): React.JSX.Element {
  const heading = useId();
  return <main className="auth-flow">
    {brand && <a className="auth-flow-brand" href="/sign-in"><span aria-hidden="true">SS</span><strong>SENSE STUDIOS</strong></a>}
    <section className={"auth-flow-card" + (wide ? " auth-flow-picker" : "")} aria-labelledby={heading}>
      <p className="auth-flow-audience">{audience}</p><h1 id={heading}>{title}</h1>
      {intro && <p className="auth-flow-intro">{intro}</p>}
      {children}
    </section>
    <p className="auth-flow-footer">Sense Studios · A secure place for your work</p>
  </main>;
}

export function PasswordField({ label, value, onChange, name, autoComplete = "new-password", disabled = false, minLength }: {
  label: string; value: string; onChange: (value: string) => void; name: string;
  autoComplete?: "current-password" | "new-password"; disabled?: boolean; minLength?: number;
}): React.JSX.Element {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <div className="auth-flow-field"><label htmlFor={id}>{label}</label>
    <div className="auth-password-control"><input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete}
      required maxLength={256} minLength={minLength} value={value} onChange={event => onChange(event.target.value)} disabled={disabled} />
      <button type="button" className="auth-show-password" aria-label={(visible ? "Hide " : "Show ") + label.toLowerCase()}
        aria-pressed={visible} onClick={() => setVisible(value => !value)} disabled={disabled}>{visible ? "Hide" : "Show"}</button>
    </div>
  </div>;
}

export function SignInHub(): React.JSX.Element {
  const choices = [
    ["/staff/sign-in", "01", "Studio team", "Owner, team leaders and employees", "Continue with your work passkey"],
    ["/client-portal/login", "02", "Clients", "Your projects, drawings and reviews", "Sign in to your client account"],
    ["/external-portal/consultant/login", "03", "Consultants", "Shared documents and project requests", "Continue with an email code"],
    ["/external-portal/vendor/login", "04", "Vendors & production", "Drawings, requirements and updates", "Continue with an email code"]
  ];
  return <AuthFrame audience="WELCOME TO SENSE STUDIOS" title="Your work starts here" intro="Choose where you work with us." brand={false} wide>
    <nav className="auth-entry-choices" aria-label="Choose your sign-in">
      {choices.map(([href, number, title, description, action]) => <a href={href} key={href} className="auth-entry-choice" aria-label={[title, description, action].join(" ")}>
        <span className="auth-entry-number" aria-hidden="true">{number}</span><span><strong>{title}</strong><span>{description}</span><small>{action}</small></span><span aria-hidden="true">↗</span>
      </a>)}
    </nav>
    <div className="auth-flow-links"><a href="/owner/sign-in">Owner sign in</a><a href="/portfolio">View our public portfolio</a></div>
  </AuthFrame>;
}

export function StaffRecovery(): React.JSX.Element {
  return <AuthFrame audience="STUDIO TEAM · ACCOUNT HELP" title="Let's get you back in" intro="Your work account uses a passkey. Choose the help you need." brand={false}>
    <ol className="auth-help-steps">
      <li><strong>Have another registered device?</strong><p>Try the passkey you already registered on that device.</p><a href="/staff/sign-in">Try signing in again</a></li>
      <li><strong>Lost your staff passkey?</strong><p>Contact the Owner so they can verify your identity and authorize a replacement.</p><a href="/enroll">I have a recovery token</a></li>
      <li><strong>Recovering the Owner account?</strong><p>Use the one-time recovery code you stored offline.</p><a href="/owner-recovery">Use an Owner recovery code</a></li>
    </ol><div className="auth-flow-links"><a href="/sign-in">Back to sign-in options</a></div>
  </AuthFrame>;
}

