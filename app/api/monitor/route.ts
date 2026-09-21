import { database,settings } from '../../../lib/db';
import { refreshGift } from '../../../lib/monitor';
export const dynamic='force-dynamic';
export async function POST(request:Request){const secret=settings().MONITOR_SECRET;if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Unauthorized'},{status:401});
 try{const db=database(),now=new Date().toISOString();const due=await db.prepare("SELECT * FROM gifts WHERE status='watching' AND (last_checked IS NULL OR last_checked < ?) ORDER BY last_checked ASC LIMIT 5").bind(new Date(Date.now()-6*3600000).toISOString()).all();for(const gift of due.results)await refreshGift(gift);
 await db.prepare("INSERT INTO system (key,value) VALUES ('heartbeat',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(now).run();return Response.json({checked:due.results.length,more:due.results.length===5});}catch(e){console.error('monitor failed',e);return Response.json({error:'Monitor failed'},{status:500});}}
