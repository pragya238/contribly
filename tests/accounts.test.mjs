import test from 'node:test';
import assert from 'node:assert/strict';
import { handleWorkspace } from '../backend/workspace-handler.mjs';
const secret='test-only-service-secret-at-least-32-characters';
const data={saved:[],skills:['Python'],experience:'Beginner',interests:[],projectType:'Web app',issues:[],contributions:[]};
function db(){const rows=new Map();return{rows,async findOne(q){return rows.get(q._id)||null;},async insertOne(row){if(rows.has(row._id))throw {code:11000};rows.set(row._id,structuredClone(row));},async updateOne(q,change){const row=rows.get(q._id);if(!row||row.revision!==q.revision)return {matchedCount:0};rows.set(q._id,{...row,...structuredClone(change.$set),revision:row.revision+1});return {matchedCount:1};}};}
const req=(userId='user-a',method='GET',body)=>({userId,method,body,authorization:`Bearer ${secret}`});
test('rejects unauthenticated service calls before database access',async()=>{
 const result=await handleWorkspace({...req(),authorization:'Bearer wrong'},null,secret);assert.equal(result.status,401);
});
test('separates account documents by server-provided identity',async()=>{
 const collection=db();await handleWorkspace(req('user-a','PUT',{revision:0,data}),collection,secret);
 assert.equal((await handleWorkspace(req('user-b'),collection,secret)).body.data,null);
 assert.deepEqual((await handleWorkspace(req(),collection,secret)).body.data.skills,['Python']);
});
test('stale account revisions cannot overwrite newer saved data',async()=>{
 const collection=db();assert.equal((await handleWorkspace(req('a','PUT',{revision:0,data}),collection,secret)).status,200);
 assert.equal((await handleWorkspace(req('a','PUT',{revision:1,data:{...data,skills:['Go']}}),collection,secret)).status,200);
 assert.equal((await handleWorkspace(req('a','PUT',{revision:1,data}),collection,secret)).status,409);
 assert.deepEqual(collection.rows.get('a').data.skills,['Go']);
});
test('simultaneous first writes use MongoDB unique ID semantics',async()=>{
 const collection=db();await handleWorkspace(req('a','PUT',{revision:0,data}),collection,secret);
 assert.equal((await handleWorkspace(req('a','PUT',{revision:0,data}),collection,secret)).status,409);
});
test('rejects client ownership fields and missing bookmark records',async()=>{
 const collection=db();assert.equal((await handleWorkspace(req('a','PUT',{revision:0,data,userId:'b'}),collection,secret)).status,400);
 assert.equal((await handleWorkspace(req('a','PUT',{revision:0,data:{...data,saved:[99]}}),collection,secret)).status,400);
});
test('rejects unbounded data and unsupported methods',async()=>{
 const collection=db();assert.equal((await handleWorkspace(req('a','PUT',{revision:0,data:{...data,skills:Array(41).fill('Python')}}),collection,secret)).status,400);
 assert.equal((await handleWorkspace(req('a','DELETE'),collection,secret)).status,405);
});
