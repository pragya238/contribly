import { z } from 'zod';
const short = z.string().max(300);
const githubIssue = z.string().regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/);
const programSource = z.string().url().refine(value => ['github.com','summerofcode.withgoogle.com'].includes(new URL(value).hostname));
export const issueSchema = z.object({
  id: z.number().int().positive(), repo: short, title: z.string().max(1000), summary: z.string().max(5000),
  lang: short, skills: z.array(short).max(40), label: short, stars: z.number().nonnegative(),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/), mark: z.string().max(10), difficulty: short, type: short,
  url: githubIssue.optional(), updated: short.optional(), labels: z.array(short).max(100),
  metadataKnown: z.boolean().optional(), fetchedAt: short.optional(), comments: z.number().nonnegative().optional(),
  assignees: z.number().nonnegative().optional(), program: short.optional(), programSource: programSource.optional(),
}).extend({ labels: z.array(short).max(100).optional() });
export const workspaceSchema = z.object({
  saved: z.array(z.number().int().positive()).max(200),
  skills: z.array(short).max(40), experience: short, interests: z.array(short).max(40), projectType: short,
  issues: z.array(issueSchema).max(200),
  contributions: z.array(z.object({ issue: issueSchema, step: z.number().int().min(0).max(9), checks: z.record(z.string().regex(/^[0-9]-[01]$/),z.boolean()), status: z.enum(['Saved','Exploring','In Progress','PR Submitted','Changes Requested','Merged','Completed']), pr: z.string().max(500) })).max(100),
}).strict().refine(d => new Set(d.saved).size === d.saved.length && d.saved.every(id => d.issues.some(i => i.id === id)), 'Saved issues must have matching records.');
export const saveWorkspaceSchema = z.object({ revision: z.number().int().nonnegative(), data: workspaceSchema }).strict();
export type AccountState = z.infer<typeof workspaceSchema>;
