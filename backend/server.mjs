import { createServer } from 'node:http';
import { MongoClient } from 'mongodb';
import { handleWorkspace, serviceAuthorized } from './workspace-handler.mjs';
const {MONGODB_URI, ACCOUNT_SERVICE_SECRET}=process.env;
if(!MONGODB_URI || !ACCOUNT_SERVICE_SECRET || ACCOUNT_SERVICE_SECRET.length<32)throw new Error('Configure MONGODB_URI and ACCOUNT_SERVICE_SECRET (at least 32 random characters).');
const client=new MongoClient(MONGODB_URI,{maxPoolSize:10,serverSelectionTimeoutMS:10000});
await client.connect();
const collection=client.db(process.env.MONGODB_DATABASE||'contribly').collection('workspaces');
const respond=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
const server=createServer(async(req,res)=>{
  try{
    if(req.url==='/health'&&req.method==='GET')return respond(res,200,{status:'ok'});
    if(req.url!=='/workspace')return respond(res,404,{error:'Not found.'});
    if(!serviceAuthorized(req.headers.authorization,ACCOUNT_SERVICE_SECRET))return respond(res,401,{error:'Unauthorized service request.'});
    if(!['GET','PUT'].includes(req.method))return respond(res,405,{error:'Method not allowed.'});
    if(req.method==='PUT'&&!req.headers['content-type']?.startsWith('application/json'))return respond(res,415,{error:'Expected JSON.'});
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>600000){respond(res,413,{error:'Workspace is too large.'});return;}chunks.push(chunk);}
    let body;
    try{body=req.method==='PUT'?JSON.parse(Buffer.concat(chunks).toString('utf8')):undefined;}catch{return respond(res,400,{error:'Invalid JSON.'});}
    const result=await handleWorkspace({method:req.method,authorization:req.headers.authorization,userId:req.headers['x-contribly-user-id'],body},collection,ACCOUNT_SERVICE_SECRET);
    respond(res,result.status,result.body);
  }catch{console.error('Account storage request failed');respond(res,503,{error:'Account storage is temporarily unavailable. Keep this tab open and retry.'});}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('Contribly account API is ready'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.close(async()=>{await client.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
