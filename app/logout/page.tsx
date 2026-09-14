import { signOut } from '@/auth';
export default function Logout() {
  return <main className="signin-page"><h1>Ready to take a break?</h1><p>Your saved workspace will be here when you return.</p><form action={async()=>{'use server';await signOut({redirectTo:'/login'});}}><button className="primary" type="submit">Log out</button></form><p><a href="/">Back to my workspace</a></p></main>;
}
