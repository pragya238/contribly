"use client";
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bookmark, Search, Sparkles, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { initialIssues, type Issue } from '@/lib/contribution';
import { buildQuery, defaultSearch, githubSearchUrl, labelOptions, programProjects, projectsFor, searchIssues, type Program, type SearchOptions } from '@/lib/discovery';

type Props = { issues: Issue[]; merge: (items: Issue[]) => void; saved: number[]; toggleSave: (id: number) => void; select: (issue: Issue) => void; skills: string[]; savedOnly: boolean; ready: boolean; externalQuery: string };
function Choice({ label, value, values, change }: { label: string; value: string; values: string[]; change: (v: string) => void }) {
  return <label className="discovery-choice"><span>{label}</span><Select value={value} onValueChange={change}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{values.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></label>;
}
export function Discovery({ issues, merge, saved, toggleSave, select, skills, savedOnly, ready, externalQuery }: Props) {
  const [options, setOptions] = useState<SearchOptions>(defaultSearch);
  const [submitted, setSubmitted] = useState<SearchOptions | null>(null);
  const [results, setResults] = useState<Issue[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [demo, setDemo] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [rank, setRank] = useState('Best skill match');
  const [difficulty,setDifficulty] = useState('Any difficulty');
  const started = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; started.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => { if (ready && !savedOnly && !started.current) { started.current = true; void run(defaultSearch, 1); } }, [ready, savedOnly]);
  useEffect(() => { setLocalSearch(externalQuery); }, [externalQuery]);
  const update = (key: keyof SearchOptions, value: string | boolean) => setOptions(o => ({ ...o, [key]: value }));
  async function run(search: SearchOptions, next: number) {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await searchIssues(search, next, current.signal);
      if (!mounted.current || current.signal.aborted) return;
      setResults(previous => next === 1 ? response.items : [...new Map([...previous, ...response.items].map(i => [i.id, i])).values()]);
      merge(response.items); setSubmitted({ ...search }); setPage(next); setTotal(response.total); setHasMore(response.hasMore); setDemo(false); setLocalSearch('');
      setNotice([response.incomplete ? 'GitHub returned partial search results.' : '', response.metadataMissing ? 'Some repository metadata is unavailable; unknown values are not treated as zero popularity.' : ''].filter(Boolean).join(' '));
    } catch (e) { if (!current.signal.aborted && mounted.current) setError(e instanceof Error ? e.message : 'Search failed. Please retry.'); }
    finally { if (mounted.current && !current.signal.aborted) setBusy(false); }
  }
  const changed = submitted && JSON.stringify(options) !== JSON.stringify(submitted);
  const visible: Issue[] = (savedOnly ? issues.filter(i => saved.includes(i.id)) : demo ? initialIssues : results).filter(i => (difficulty === 'Any difficulty' || (difficulty === 'Beginner labels' ? i.difficulty.startsWith('Beginner') : i.difficulty === 'Not assessed')) && `${i.title} ${i.repo} ${i.summary} ${i.skills.join(' ')}`.toLowerCase().includes(localSearch.toLowerCase()));
  const matches = (i: Issue) => skills.filter(s => i.lang === s || i.skills.includes(s));
  visible.sort((a,b) => rank === 'Most stars' ? (b.metadataKnown === false ? -1 : b.stars) - (a.metadataKnown === false ? -1 : a.stars) : rank === 'Recently updated' ? (b.updated || '').localeCompare(a.updated || '') : matches(b).length - matches(a).length);
  const scopes = projectsFor(options);
  let searchLink = ''; try { searchLink = githubSearchUrl(buildQuery(options)); } catch { /* Invalid custom targets are explained on submit. */ }
  return <section className="discovery-surface">
    {!savedOnly && <div className="discovery-controls">
      <div className="section-heading"><h2>Where do you want to contribute?</h2></div>
      <Tabs value={options.program} onValueChange={v => setOptions(o => ({...o, program: v as Program, project: 'All listed projects'}))}><TabsList className="program-tabs" aria-label="Contribution target">{(['All GitHub','GSoC','LFX','Custom target'] as Program[]).map(p => <TabsTrigger key={p} value={p}>{p}</TabsTrigger>)}</TabsList></Tabs>
      {options.program === 'All GitHub' && <p className="discovery-help">Search public repositories across GitHub. There is no fixed repository list. Labels help discovery, but do not certify project quality.</p>}
      {['GSoC','LFX'].includes(options.program) && <div className="program-context">
        <div><strong>{options.program === 'GSoC' ? 'Google Summer of Code · 2026' : 'LFX Mentorship · CNCF Sep–Nov 2026'}</strong><p>{options.program === 'GSoC' ? 'Four verified participating organizations to get you started.' : 'Four projects listed in CNCF’s term directory to get you started.'} This is a curated subset, not the full program. Ordinary contribution issues are not mentorship slots; participation does not mean applications are open.</p></div>
        <a href={options.program === 'GSoC' ? 'https://summerofcode.withgoogle.com/programs/2026/organizations' : 'https://mentorship.lfx.linuxfoundation.org/'} target="_blank" rel="noreferrer">Browse full program directory <ArrowUpRight size={15}/></a>
        <Choice label="Program project" value={options.project} values={['All listed projects', ...programProjects.filter(p => p.program === options.program).map(p => p.name)]} change={v => update('project',v)}/>
        <div className="program-sources"><span>Sources checked September 13, 2026:</span>{scopes.map(p => <a key={p.name} href={p.source} target="_blank" rel="noreferrer">{p.name} ↗</a>)}</div>
        <p className="discovery-help">Found another project in the official directory? Use Custom target with its GitHub organization or repository.</p>
      </div>}
      <form onSubmit={e => { e.preventDefault(); void run(options,1); }}>
        {options.program === 'Custom target' && <label className="target-input">GitHub organization or repository<input value={options.target} onChange={e => update('target',e.target.value)} placeholder="e.g. zulip or kubernetes-sigs/headlamp" maxLength={150}/><small>You can also paste a GitHub repository URL. Custom targets are not automatically marked as program participants.</small></label>}
        <div className="search"><Search size={19}/><input aria-label="Search across GitHub" placeholder="Search issue keywords across GitHub…" value={options.text} onChange={e => update('text',e.target.value)} maxLength={100}/></div>
        <div className="discovery-filters">
          <Choice label="Language" value={options.language} values={['Any language','JavaScript','TypeScript','Python','Java','Go','Rust','C','C++','C#','Ruby','PHP','Dart','Kotlin','Swift','HTML','CSS']} change={v => update('language',v)}/>
          <Choice label="Issue labels" value={options.label} values={labelOptions} change={v => update('label',v)}/>
          <Choice label="GitHub order" value={options.order} values={['Recently updated','Newest issues']} change={v => update('order',v)}/>
          <label className="check-row"><Checkbox checked={options.unassigned} onCheckedChange={v => update('unassigned',v === true)}/>Unassigned only</label>
          <button className="primary" disabled={busy} type="submit">{busy ? 'Searching…' : 'Search GitHub'}<ArrowRight size={16}/></button>
        </div>
      </form>
      {changed && <p className="discovery-help">Filters changed. Press Search GitHub to apply them; the results below still use your previous search.</p>}
      <details className="source-explainer"><summary>Where do these issues come from?</summary><p>Live results come directly from GitHub’s public issue-search API, 30 at a time. We show the original labels, update date, assignment count and issue link. Repository language and stars are fetched separately and cached for an hour. No project is endorsed or quality-vetted. A beginner label is an estimate, not a difficulty assessment.</p><p>GSoC/LFX matching uses the linked, dated program directory entries and explicit GitHub scopes—not keywords in issue titles. Check current eligibility, project ideas and dates on the program’s own site.</p>{searchLink && <a href={searchLink} target="_blank" rel="noreferrer">Inspect this search on GitHub ↗</a>}</details>
    </div>}
    <div className="section-heading results-heading"><h2>{savedOnly ? 'Your saved issues' : demo ? 'Illustrative demo issues' : 'Live issue results'} <span className="count">{visible.length}</span></h2><Choice label="Difficulty estimate" value={difficulty} values={['Any difficulty','Beginner labels','Not assessed']} change={setDifficulty}/><Choice label="Sort loaded results" value={rank} values={['Best skill match','Recently updated','Most stars']} change={setRank}/></div>
    <div className="search"><Search size={17}/><input aria-label="Filter loaded issues" placeholder={savedOnly ? 'Filter saved issues…' : 'Filter results already loaded…'} value={localSearch} onChange={e => setLocalSearch(e.target.value)}/></div>
    {!savedOnly && <div className="data-notice"><span>{demo ? 'Fictional tasks for exploring the workflow. Not live opportunities.' : submitted ? `${total.toLocaleString()} matches on GitHub · ${results.length} loaded · ${submitted.program}${submitted.project !== 'All listed projects' ? ` / ${submitted.project}` : ''}` : 'Live results are loading. Demo data is available separately.'}</span><button onClick={() => {controller.current?.abort(); setBusy(false); setDemo(d => !d); setLocalSearch('');}}>{demo ? 'Return to live results' : 'Explore demo instead'}</button></div>}
    {error && <div className="discovery-error" role="alert"><strong>Couldn’t load issues</strong><p>{error}</p>{searchLink && <a href={searchLink} target="_blank" rel="noreferrer">Continue on GitHub ↗</a>}<button className="secondary" disabled={busy} onClick={() => void run(options,1)}>Retry search</button></div>}
    {notice && <p className="discovery-help" role="status">{notice}</p>}
    {busy && <p role="status" className="discovery-help">Finding open issues and reading repository metadata…</p>}
    <div className="issue-grid">{visible.map(i => <article className="issue-card" key={i.id}>
      <div className="repo-row"><span className="repo-icon" style={{background:i.color}}>{i.mark}</span><span>{i.repo}</span><button aria-label={`${saved.includes(i.id) ? 'Unsave' : 'Save'} ${i.title}`} onClick={() => { merge([i]); toggleSave(i.id); }}><Bookmark size={18} fill={saved.includes(i.id) ? '#a8d5b8' : 'none'}/></button></div>
      <h3><button className="issue-title" onClick={() => select(i)}>{i.title}</button></h3><p>{i.summary}</p>
      <div className="tags"><span className="tag green">{i.url ? 'Live GitHub' : 'Demo'}</span>{i.program && <a className="tag" href={i.programSource} target="_blank" rel="noreferrer">{i.program} ↗</a>}{(i.labels?.length ? i.labels.slice(0,3) : [i.label]).map(l => <span key={l} className="tag">{l}</span>)}</div>
      <div className="issue-meta"><span>{i.lang}</span><span><Star size={14}/>{i.metadataKnown === false ? 'Unknown' : i.stars.toLocaleString()}</span><span>{i.difficulty}</span></div>
      {i.updated && <div className="issue-provenance"><span>Updated {new Date(i.updated).toLocaleDateString()}</span><span>{i.assignees ? `${i.assignees} assigned` : 'Unassigned'} · {i.comments ?? 0} comments</span><a href={i.url} target="_blank" rel="noreferrer">Original issue ↗</a></div>}
      <div className="match"><Sparkles size={14}/>{matches(i).length ? `Matches your ${matches(i).join(', ')} skills` : i.url ? 'Matches your search · check the scope before starting' : 'Illustrative task · explore the workflow'}</div>
    </article>)}</div>
    {!visible.length && !busy && <div className="empty"><Search size={30}/><h2>{savedOnly ? 'No saved issues match' : 'No matching issues yet'}</h2><p>{savedOnly ? 'Save an issue from discovery to keep it here.' : 'Try All open issues, any language, or include assigned issues. Some projects use different labels or issue trackers.'}</p></div>}
    {!savedOnly && !demo && submitted && hasMore && <div className="load-more"><button className="secondary" disabled={busy} onClick={() => void run(submitted,page+1)}>Load more issues <ArrowRight size={16}/></button></div>}
    {!savedOnly && submitted && total > 1000 && <p className="discovery-help">GitHub exposes at most 1,000 results per search. Narrow by language, project or keywords to explore further.</p>}
  </section>;
}
