import ContriblyApp from './contribly-app';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return <ContriblyApp key={session.user.id} user={{displayName:session.user.name || 'Contributor',email:session.user.email || ''}} signOutPath="/logout"/>;
}
