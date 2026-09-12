import ContriblyApp from './contribly-app';
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from './chatgpt-auth';
import { GitBranch, ArrowRight } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user=await getChatGPTUser();
  if(!user)return <main className="signin-page"><a className="brand" href="/"><span className="brand-icon"><GitBranch size={24}/></span>contribly<span className="brand-dot">.</span></a><span className="eyebrow">YOUR OPEN-SOURCE JOURNEY</span><h1>One account.<br/>Every next step.</h1><p>Sign in to find issues that fit your skills and keep your saved issues, contribution checklists, and progress together.</p><a className="primary" href={chatGPTSignInPath('/')} target="_top">Sign in with ChatGPT <ArrowRight size={18}/></a><div className="signin-benefits"><span>Personal recommendations</span><span>Saved across devices</span><span>Your private workspace</span></div></main>;
  return <ContriblyApp key={user.userId} user={{displayName:user.displayName,email:user.email}} signOutPath={chatGPTSignOutPath('/')}/>;
}
