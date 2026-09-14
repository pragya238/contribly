import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { ArrowUpRight, Bookmark, Check, GitBranch, GitPullRequest, Sparkles } from 'lucide-react';
import './login.css';
export const dynamic = 'force-dynamic';
export default async function Login({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  if ((await auth())?.user?.id) redirect('/');
  const { mode, error } = await searchParams;
  const signup = mode === 'signup';
  return <main className="auth-shell">
    <aside className="auth-story">
      <a className="brand" href="/login"><span className="brand-icon"><GitBranch size={24}/></span>contribly<span className="brand-dot">.</span></a>
      <div className="auth-story-main"><span className="auth-kicker">SMALL STEPS. REAL CONTRIBUTIONS.</span><h1>Your first PR<br/>starts here<span>.</span></h1><p>Find your people. Build your skills.<br/>Make something better, together.</p>
        <div className="auth-demo"><div className="auth-demo-top"><span><GitPullRequest size={18}/> YOUR NEXT CHAPTER</span><Sparkles size={20}/></div><h2>One issue. A little courage.</h2><p>You don’t need to know everything to get started.</p><div className="auth-demo-step"><Check size={18}/> Find an issue that fits you</div><div className="auth-demo-step"><Check size={18}/> Follow a guided contribution plan</div><div className="auth-demo-step"><Bookmark size={18}/> Pick up right where you left off</div><span className="auth-sticker">you’ve got this ↗</span></div>
      </div><small className="auth-footer">Made for the first step, and every step after.</small>
    </aside>
    <section className="auth-form-panel"><div className="auth-panel-top"><span>YOUR PERSONAL WORKSPACE</span><GitBranch size={22}/></div><div className="auth-form-body">
      <nav className="auth-tabs" aria-label="Account access"><a href="/login" aria-current={!signup?'page':undefined}>Log in</a><a href="/login?mode=signup" aria-current={signup?'page':undefined}>Sign up</a></nav>
      <span className="auth-welcome">{signup?'LET’S MAKE A START':'GOOD TO SEE YOU AGAIN'}</span><h2>{signup?<>A fresh start.<br/>A world to build.</>:<>Welcome back,<br/>contributor.</>}</h2><p>{signup?'Create your free Contribly account and turn your curiosity into your first contribution.':'Your saved issues, skills, and contribution progress—all waiting right here.'}</p>
      {error&&<div className="auth-error" role="alert">We couldn’t complete sign-in. Please try again. If it continues, contact the site owner.</div>}
      <form action={async()=>{'use server';await signIn('github',{redirectTo:'/'});}}><button className="auth-submit" type="submit"><GitBranch size={22}/><span>{signup?'Sign up with GitHub':'Log in with GitHub'}</span><ArrowUpRight size={20}/></button></form>
      <p className="auth-note">{signup?'Already have a GitHub account? That’s all you need.':'New here? Your first GitHub sign-in creates your Contribly account automatically.'}</p>
      <div className="auth-perks"><span><Bookmark size={17}/> Saved issues</span><span><Sparkles size={17}/> Your skills</span><span><GitPullRequest size={17}/> Your progress</span></div>
      <div className="auth-privacy"><span className="auth-status-dot"/>Your workspace is yours. Your GitHub password stays with GitHub.</div>
    </div><div className="auth-panel-bottom"><span>A little help. A big first step.</span><span>01 — GET STARTED</span></div></section>
  </main>;
}
