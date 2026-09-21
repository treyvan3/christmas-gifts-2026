import { env } from 'cloudflare:workers';
export function database(): D1Database { if(!env.DB) throw new Error('Saved lists are temporarily unavailable. Please try again.'); return env.DB; }
export function settings() { return env as unknown as {SERPAPI_KEY?:string; MONITOR_SECRET?:string}; }
