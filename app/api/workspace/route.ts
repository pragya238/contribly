import { getChatGPTUser } from '@/app/chatgpt-auth';
import { env } from 'cloudflare:workers';
import { saveWorkspaceSchema } from '@/lib/account-state';
export const dynamic = 'force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Cookie','X-Content-Type-Options':'nosniff'}});
async function proxy(request?:Request){
  const user=await getChatGPTUser();
  if(!user)return json({error:'Sign in to access your personal workspace.'},401);
  let body;
  if(request){
    if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Cross-site writes are not allowed.'},403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Expected JSON.'},415);
    if(Number(request.headers.get('content-length')||0)>600000)return json({error:'Workspace is too large.'},413);
    try{const raw=await request.text();if(raw.length>600000)return json({error:'Workspace is too large.'},413);const parsed=saveWorkspaceSchema.safeParse(JSON.parse(raw));if(!parsed.success)return json({error:'Invalid workspace data or account capacity exceeded.'},400);body=JSON.stringify(parsed.data);}catch{return json({error:'Invalid JSON.'},400);}
  }
  try{
    const url=new URL(env.ACCOUNT_API_URL||'');
    if(url.protocol!=='https:'||url.username||url.password||!env.ACCOUNT_SERVICE_SECRET||env.ACCOUNT_SERVICE_SECRET.length<32)throw new Error('Account service not configured');
    // Free Render instances can take over 50 seconds to resume after inactivity.
    const response=await fetch(new URL('/workspace',url),{method:request?'PUT':'GET',redirect:'error',headers:{Authorization:`Bearer ${env.ACCOUNT_SERVICE_SECRET}`,'X-Contribly-User-Id':user.userId,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(90000)});
    if(![200,400,409,413].includes(response.status))throw new Error('Account backend unavailable');
    return json(await response.json(),response.status);
  }catch{console.error('Account service unavailable');return json({error:'Your account storage is not available yet. Keep this tab open and retry once MongoDB is connected.'},503);}
}
export async function GET(){return proxy();}
export async function PUT(request:Request){return proxy(request);}
