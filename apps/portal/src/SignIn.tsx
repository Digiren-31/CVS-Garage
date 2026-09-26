import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Field, Input, Spinner } from '@fluentui/react-components';
import { ArrowRight20Regular, ShieldCheckmark24Regular } from '@fluentui/react-icons';
import { useApiMutation } from '@cvs-garage/api-client';
import { ColorRail, InlineError, ErrorState } from '@cvs-garage/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@cvs-garage/contracts';
import { Brand, ThemeSwitch } from './Shell';

export function SignIn({ session, loading, error }: { session: Session; loading: boolean; error: unknown }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const mutation = useApiMutation(); const navigate = useNavigate(); const client = useQueryClient(); const [params] = useSearchParams();
  const target = params.get('next'); const next = target?.startsWith('/') && !target.startsWith('//') && !target.startsWith('/sign-in') ? target : '/home';
  if (session.member) return <Navigate to={next} replace />;
  async function submit(event?: FormEvent, demo = false) {
    event?.preventDefault();
    try {
      await mutation.mutateAsync({ path: demo ? '/session/demo' : '/session/sign-in', body: demo ? {} : { email, password } });
      setPassword(''); client.clear(); navigate(next, { replace: true });
    } catch { /* The inline error is announced below the form. */ }
  }
  return <div className="sign-in-page"><header className="landing-nav"><Brand compact /><ThemeSwitch /></header><main id="main-content" className="sign-in-layout"><section className="sign-in-story"><div className="eyebrow">A shared campus</div><h1>Come for an idea.<br />Stay for<br /><span>the people.</span></h1><p>One place for the projects, conversations and connections that make campus feel a little more like yours.</p><ColorRail /></section><section className="sign-in-form"><div className="eyebrow">Make yourself at home</div><h2>Welcome to the Garage.</h2><p className="muted">Use your campus-provisioned account to continue.</p>{error ? <ErrorState error={error} retry={() => location.reload()} /> : <form className="form-stack" onSubmit={(e) => void submit(e)}><Field label="Campus email" required><Input type="email" autoComplete="username" value={email} onChange={(_, data) => setEmail(data.value)} required maxLength={254} /></Field><Field label="Password" required><Input type="password" autoComplete="current-password" value={password} onChange={(_, data) => setPassword(data.value)} required maxLength={256} /></Field><InlineError error={mutation.error} /><Button type="submit" appearance="primary" size="large" disabled={mutation.isPending || loading} icon={mutation.isPending ? <Spinner size="tiny" /> : <ArrowRight20Regular />} iconPosition="after">Sign in</Button></form>}
    {session.demoAvailable && <div className="demo-sign-in"><div><span>Just looking around?</span><p>Try a fictional student workspace. No email or password needed.</p></div><Button size="large" disabled={mutation.isPending} onClick={() => void submit(undefined, true)}>Explore the demo <ArrowRight20Regular /></Button></div>}
    <div className="sign-in-note"><ShieldCheckmark24Regular /><p>Accounts are managed by your campus. Need access? Contact your campus coordinator. No role selection or public admin signup.</p></div><Link to="/home" className="text-link">Keep exploring as a visitor <ArrowRight20Regular /></Link></section></main></div>;
}
