import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuery, defaultSearch, normalizeTarget, searchIssues } from '../lib/discovery.ts';
test('global discovery is not tied to a fixed repository list', () => {
  const q = buildQuery(defaultSearch);
  assert(!q.includes('org:')); assert(!q.includes('repo:'));
  assert(q.includes('"help wanted"')); assert(q.includes('no:assignee'));
});
test('custom repository URLs are normalized and cannot inject qualifiers', () => {
  assert.equal(normalizeTarget('https://github.com/zulip/zulip.git'), 'zulip/zulip');
  assert.throws(() => normalizeTarget('zulip is:closed'));
  assert.throws(() => normalizeTarget('https://evil.example/zulip'));
  const q = buildQuery({...defaultSearch,program:'Custom target',target:'zulip/zulip',unassigned:false,label:'All open issues'});
  assert(q.includes('repo:zulip/zulip')); assert(!q.includes('no:assignee')); assert(!q.includes('label:'));
});
test('program scope uses dated verified projects, not program keywords', () => {
  assert(buildQuery({...defaultSearch,program:'GSoC',project:'Zulip'}).includes('org:zulip'));
  assert(buildQuery({...defaultSearch,program:'LFX',project:'Headlamp'}).includes('repo:kubernetes-sigs/headlamp'));
  assert.throws(() => buildQuery({...defaultSearch,program:'LFX',project:'Unverified project'}));
});
const issue = { id:92, repository_url:'https://api.github.com/repos/test-discovery/project', html_url:'https://github.com/test-discovery/project/issues/92',title:'Example',state:'open',labels:[{name:'help wanted'}],assignees:[],comments:2,updated_at:'2026-09-13T00:00:00Z' };
test('pagination and failed metadata preserve truthful unknowns',async()=>{
  let requested;
  const request=async url=>{if(url.includes('/search/')){requested=new URL(url);return Response.json({total_count:100,items:[issue],incomplete_results:false});}return new Response('',{status:403});};
  const result=await searchIssues(defaultSearch,2,undefined,request);
  assert.equal(requested.searchParams.get('page'),'2');assert.equal(requested.searchParams.get('per_page'),'30');
  assert.equal(result.items[0].difficulty,'Not assessed'); assert.equal(result.items[0].metadataKnown,false);assert.equal(result.metadataMissing,true);assert(result.hasMore);
});
test('closed issues and PRs are never presented as open contribution issues',async()=>{
  const request=async()=>Response.json({items:[{...issue,state:'closed'},{...issue,pull_request:{}}],total_count:2});
  assert.equal((await searchIssues(defaultSearch,1,undefined,request)).items.length,0);
});
test('rate limits are explained instead of substituted with demo records',async()=>{
  await assert.rejects(searchIssues(defaultSearch,1,undefined,async()=>new Response('',{status:429})),/rate limit/);
});
test('global searches never label an issue as a verified program match',async()=>{
  const request=async url=>url.includes('/search/')?Response.json({items:[issue],total_count:1}):Response.json({language:'Python',stargazers_count:42});
  const result=await searchIssues(defaultSearch,1,undefined,request);
  assert.equal(result.items[0].program,undefined);assert.equal(result.items[0].stars,42);assert.equal(result.items[0].lang,'Python');
});
