import { timingSafeEqual } from 'node:crypto';
import { saveWorkspaceSchema } from '../lib/account-state.ts';
export function serviceAuthorized(header, secret) {
  if (!secret || secret.length < 32 || !header?.startsWith('Bearer ')) return false;
  const supplied=Buffer.from(header.slice(7));const expected=Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied,expected);
}
export async function handleWorkspace({method,authorization,userId,body}, collection, secret) {
  if (!serviceAuthorized(authorization,secret)) return {status:401,body:{error:'Unauthorized service request.'}};
  if (typeof userId !== 'string' || !userId || userId.length > 256) return {status:400,body:{error:'Authenticated user ID required.'}};
  if(method==='GET'){
    const row=await collection.findOne({_id:userId});
    return {status:200,body:{data:row?.data??null,revision:row?.revision??0}};
  }
  if(method!=='PUT')return {status:405,body:{error:'Method not allowed.'}};
  const parsed=saveWorkspaceSchema.safeParse(body);
  if(!parsed.success)return {status:400,body:{error:'Workspace data is invalid or exceeds account limits (200 saved issues / 100 contributions).'}};
  const {data,revision}=parsed.data;
  if(revision===0){
    try{await collection.insertOne({_id:userId,data,revision:1,updatedAt:new Date()});}
    catch(e){if(e.code===11000)return {status:409,body:{error:'This account changed in another tab or device. Reload its current version before saving.'}};throw e;}
  }else{
    const result=await collection.updateOne({_id:userId,revision},{$set:{data,updatedAt:new Date()},$inc:{revision:1}});
    if(!result.matchedCount)return {status:409,body:{error:'This account changed in another tab or device. Reload its current version before saving.'}};
  }
  return {status:200,body:{revision:revision+1}};
}
