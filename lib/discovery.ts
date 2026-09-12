import type { Issue } from './contribution';

export type Program = 'All GitHub' | 'GSoC' | 'LFX' | 'Custom target';
export type ProgramProject = { name: string; program: Program; scope: string; edition: string; source: string };
const gsoc = 'https://summerofcode.withgoogle.com/programs/2026/organizations/';
const lfx = 'https://github.com/cncf/mentoring/blob/main/programs/lfx-mentorship/2026/03-Sep-Nov/README.md';
// A deliberately labeled, sourced starter directory, not a complete program roster.
export const programProjects: ProgramProject[] = [
  { name: 'Zulip', program: 'GSoC', scope: 'zulip', edition: 'GSoC 2026', source: gsoc + 'zulip' },
  { name: 'Jenkins', program: 'GSoC', scope: 'jenkinsci', edition: 'GSoC 2026', source: gsoc + 'jenkins-wp' },
  { name: 'Accord Project', program: 'GSoC', scope: 'accordproject', edition: 'GSoC 2026', source: gsoc + 'accord-project' },
  { name: 'JabRef', program: 'GSoC', scope: 'JabRef', edition: 'GSoC 2026', source: gsoc + 'jabref-ev' },
  { name: 'Apicurio Registry', program: 'LFX', scope: 'Apicurio/apicurio-registry', edition: 'LFX / CNCF Sep–Nov 2026', source: lfx + '#apicurio-registry' },
  { name: 'Flatcar', program: 'LFX', scope: 'flatcar/Flatcar', edition: 'LFX / CNCF Sep–Nov 2026', source: lfx + '#flatcar-container-linux' },
  { name: 'HAMi', program: 'LFX', scope: 'Project-HAMi/HAMi', edition: 'LFX / CNCF Sep–Nov 2026', source: lfx + '#hami' },
  { name: 'Headlamp', program: 'LFX', scope: 'kubernetes-sigs/headlamp', edition: 'LFX / CNCF Sep–Nov 2026', source: lfx + '#headlamp' },
];
export const labelOptions = ['Welcoming labels', 'good first issue', 'help wanted', 'first timers only', 'All open issues'];
export const defaultSearch = { program: 'All GitHub' as Program, project: 'All listed projects', target: '', text: '', language: 'Any language', label: 'Welcoming labels', unassigned: true, order: 'Recently updated' };
export type SearchOptions = typeof defaultSearch;
export function normalizeTarget(value: string): string {
  const scope = value.trim().replace(/^https:\/\/github\.com\//i, '').replace(/\/$/, '').replace(/\.git$/, '');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*(?:\/[a-zA-Z0-9_.-]+)?$/.test(scope)) throw new Error('Enter a GitHub owner or owner/repository, such as zulip or zulip/zulip.');
  return scope;
}
export function projectsFor(options: SearchOptions) {
  return programProjects.filter(p => p.program === options.program && (options.project === 'All listed projects' || p.name === options.project));
}
export function buildQuery(options: SearchOptions): string {
  const parts = ['is:issue', 'is:open', 'archived:false'];
  if (options.unassigned) parts.push('no:assignee');
  const scopes = options.program === 'Custom target' ? [normalizeTarget(options.target)] : projectsFor(options).map(p => p.scope);
  if (['GSoC', 'LFX'].includes(options.program) && !scopes.length) throw new Error('Choose a project from the selected program.');
  parts.push(...scopes.map(scope => `${scope.includes('/') ? 'repo' : 'org'}:${scope}`));
  if (options.language !== 'Any language') parts.push(`language:"${options.language.replace(/["\\]/g, '')}"`);
  if (options.label === 'Welcoming labels') parts.push('label:"good first issue","good-first-issue","help wanted","first timers only","first-timers-only","beginner-friendly"');
  else if (options.label !== 'All open issues') parts.push(`label:"${options.label.replace(/["\\]/g, '')}"`);
  // Treat keyword input as literal words, not arbitrary qualifiers that can override the chosen scope.
  if (options.text.trim()) parts.push(...options.text.trim().split(/\s+/).map(word => `"${word.replace(/["\\]/g, '')}"`));
  return parts.join(' ');
}
export const githubSearchUrl = (q: string) => `https://github.com/search?q=${encodeURIComponent(q)}&type=issues`;
const repositoryCache = new Map<string, { data: any; at: number }>();
export async function searchIssues(options: SearchOptions, page: number, signal?: AbortSignal, request: typeof fetch = fetch) {
  if (!Number.isInteger(page) || page < 1 || page > 34) throw new Error('Invalid result page.');
  const query = buildQuery(options);
  const params = new URLSearchParams({ q: query, sort: options.order === 'Newest issues' ? 'created' : 'updated', order: 'desc', per_page: '30', page: String(page) });
  const response = await request(`https://api.github.com/search/issues?${params}`, { signal, headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) {
    const reset = response.headers.get('x-ratelimit-reset');
    const when = reset ? ` Try after ${new Date(Number(reset) * 1000).toLocaleTimeString()}.` : ' Wait a minute and try again.';
    throw new Error(response.status === 403 || response.status === 429 ? `GitHub’s public rate limit was reached.${when} You can also open this search on GitHub.` : `GitHub could not complete the search (${response.status}). Try a different target or retry.`);
  }
  const data: any = await response.json();
  if (!Array.isArray(data.items)) throw new Error('GitHub returned an unexpected response. Please retry.');
  const records = data.items.filter((i: any) => !i.pull_request && i.state === 'open' && /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(i.html_url));
  let metadataMissing = false;
  // Six at a time; cached metadata avoids repeatedly spending public API quota.
  const urls = [...new Set<string>(records.map((i: any) => i.repository_url))];
  for (let offset = 0; offset < urls.length; offset += 6) {
    await Promise.all(urls.slice(offset, offset + 6).map(async url => {
      if (!/^https:\/\/api\.github\.com\/repos\/[\w.-]+\/[\w.-]+$/.test(url)) return;
      const cached = repositoryCache.get(url);
      if (cached && Date.now() - cached.at < 3_600_000) return;
      try { const r = await request(url, { signal }); if (r.ok) repositoryCache.set(url, { data: await r.json(), at: Date.now() }); else metadataMissing = true; }
      catch (e) { if (signal?.aborted) throw e; metadataMissing = true; }
    }));
  }
  const items: Issue[] = records.map((i: any) => {
    const repo = repositoryCache.get(i.repository_url)?.data;
    const labels: string[] = (i.labels || []).map((l: any) => typeof l === 'string' ? l : l.name).filter(Boolean);
    const starter = labels.find(l => /good.?first|first.?timers|beginner/i.test(l));
    const name = i.repository_url.split('/repos/')[1];
    const project = projectsFor(options).find(p => p.scope.toLowerCase() === name.toLowerCase() || p.scope.toLowerCase() === name.split('/')[0].toLowerCase());
    return { id: i.id, repo: name.replace('/', ' / '), title: i.title, summary: (i.body || 'Read the issue discussion for the full requirements.').replace(/[#*`>]/g, '').slice(0,240), lang: repo?.language || 'Unknown', skills: repo?.language ? [repo.language] : [], label: starter || labels.find(l => /help.?wanted/i.test(l)) || labels[0] || 'No labels', labels, stars: repo?.stargazers_count ?? 0, metadataKnown: !!repo, color: '#181a18', mark: name.slice(0,2).toUpperCase(), difficulty: starter ? 'Beginner label' : 'Not assessed', type: 'Open source', url: i.html_url, updated: i.updated_at, fetchedAt: new Date().toISOString(), comments: i.comments, assignees: i.assignees?.length || 0, program: project?.edition, programSource: project?.source };
  });
  return { items, total: Number(data.total_count) || 0, incomplete: !!data.incomplete_results, metadataMissing, query, hasMore: page * 30 < Math.min(Number(data.total_count) || 0, 1000) && records.length > 0 };
}
