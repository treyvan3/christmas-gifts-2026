import { getChatGPTUser } from '../../chatgpt-auth';
import { database, settings } from '../../../lib/db';
import { safeUrl } from '../../../lib/extract';
import { refreshGift } from '../../../lib/monitor';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
async function initGroups(user:string){const db=database();await db.batch(['My family',"Liv’s family",'Other'].map((name,i)=>db.prepare('INSERT OR IGNORE INTO groups (id,user_id,name) VALUES (?,?,?)').bind(user+':'+i,user,name)));}
export async function GET(){try{const user=await getChatGPTUser();if(!user)return json({error:'Sign in to open your saved gifts.'},401);const db=database();await initGroups(user.userId);
 const [gs,as,groups,budget,heartbeat]=await Promise.all([db.prepare('SELECT * FROM gifts WHERE user_id=? ORDER BY created_at DESC').bind(user.userId).all<any>(),db.prepare('SELECT * FROM alerts WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.userId).all(),db.prepare('SELECT id,name FROM groups WHERE user_id=? ORDER BY rowid').bind(user.userId).all(),db.prepare('SELECT amount FROM budgets WHERE user_id=?').bind(user.userId).first<{amount:number}>(),db.prepare("SELECT value FROM system WHERE key='heartbeat'").first<{value:string}>()]);
 const gifts=await Promise.all(gs.results.map(async(g:any)=>({...g,user_id:undefined,offers:JSON.parse(g.offers),history:(await db.prepare('SELECT * FROM observations WHERE gift_id=? ORDER BY checked_at DESC LIMIT 120').bind(g.id).all()).results})));
 return json({gifts,alerts:as.results,groups:groups.results,budget:budget?.amount||0,searchReady:!!settings().SERPAPI_KEY,monitorHeartbeat:heartbeat?.value||null});
 }catch(e){console.error('dashboard read failed',e);return json({error:'Your list could not be loaded. Please try again.'},503);}}
const str=(x:unknown,n:number)=>typeof x==='string'?x.trim().slice(0,n):'';
export async function POST(request:Request){
 try{if(request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Please use the dashboard to make changes.'},403);
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in to save gifts across devices.'},401);
 if(Number(request.headers.get('content-length')||0)>12000)return json({error:'Request too large.'},413);
 const text=await request.text();if(text.length>12000)return json({error:'Request too large.'},413);const body=JSON.parse(text);const db=database(),uid=user.userId;await initGroups(uid);
 if(body.action==='budget'){const n=Number(body.amount);if(!Number.isFinite(n)||n<0||n>1000000)return json({error:'Enter a budget from $0 to $1,000,000.'},400);await db.prepare('INSERT INTO budgets (user_id,amount) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET amount=excluded.amount').bind(uid,Math.round(n*100)/100).run();return json({ok:true});}
 if(body.action==='group'){const name=str(body.name,60);if(!name)return json({error:'Enter a group name.'},400);if(body.id){await db.prepare('UPDATE groups SET name=? WHERE id=? AND user_id=?').bind(name,str(body.id,200),uid).run();}else{const count=await db.prepare('SELECT COUNT(*) AS n FROM groups WHERE user_id=?').bind(uid).first<{n:number}>();if((count?.n||0)>=20)return json({error:'You can use up to 20 groups.'},400);await db.prepare('INSERT INTO groups (id,user_id,name) VALUES (?,?,?)').bind(crypto.randomUUID(),uid,name).run();}return json({ok:true});}
 if(body.action==='seen'){const ids=Array.isArray(body.ids)?body.ids.slice(0,100).map((x:unknown)=>str(x,100)):[];if(ids.length)await db.batch(ids.map((id:string)=>db.prepare('UPDATE alerts SET seen=1 WHERE id=? AND user_id=?').bind(id,uid)));return json({ok:true});}
 if(body.action==='add'){
 const name=str(body.name,160),recipient=str(body.recipient,100),query=str(body.query,240),url=str(body.url,2000),group=str(body.groupId,200);if(!name||!recipient||(!query&&!url))return json({error:'Add a gift name, recipient, and either a product search or store link.'},400);if(url)safeUrl(url);
 if(!await db.prepare('SELECT id FROM groups WHERE id=? AND user_id=?').bind(group,uid).first())return json({error:'Choose one of your groups.'},400);
 const count=await db.prepare('SELECT COUNT(*) AS n FROM gifts WHERE user_id=?').bind(uid).first<{n:number}>();if((count?.n||0)>=100)return json({error:'This planner supports up to 100 gifts.'},400);
 const threshold=Math.max(5,Math.min(80,Number(body.threshold)||15));const plan=body.plannedPrice===''||body.plannedPrice===undefined?null:Number(body.plannedPrice);if(plan!==null&&(!Number.isFinite(plan)||plan<0||plan>1000000))return json({error:'Enter a valid planned price.'},400);
 const id=crypto.randomUUID();await db.prepare('INSERT INTO gifts (id,user_id,group_id,name,recipient,query,url,threshold,planned_price,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,uid,group,name,recipient,query,url,threshold,plan,new Date().toISOString()).run();
 const gift=await db.prepare('SELECT * FROM gifts WHERE id=?').bind(id).first();await refreshGift(gift,true);return json({ok:true,id});
 }
 const id=str(body.id,100);const gift=await db.prepare('SELECT * FROM gifts WHERE id=? AND user_id=?').bind(id,uid).first<any>();if(!gift)return json({error:'Gift not found.'},404);
 if(body.action==='refresh'){await refreshGift(gift,true);return json({ok:true});}
 if(body.action==='status'){if(!['watching','purchased'].includes(body.status))return json({error:'Invalid purchase status.'},400);await db.prepare('UPDATE gifts SET status=? WHERE id=? AND user_id=?').bind(body.status,id,uid).run();return json({ok:true});}
 if(body.action==='choose'){const offer=JSON.parse(gift.offers).find((o:any)=>o.id===body.offerId);if(!offer)return json({error:'That offer is no longer available.'},400);await db.prepare('UPDATE gifts SET selected_offer_id=?,current_price=?,currency=? WHERE id=?').bind(offer.id,offer.price,offer.currency,id).run();return json({ok:true});}
 if(body.action==='edit'){const name=str(body.name,160),recipient=str(body.recipient,100),group=str(body.groupId,200);if(!name||!recipient||!await db.prepare('SELECT id FROM groups WHERE id=? AND user_id=?').bind(group,uid).first())return json({error:'Check the gift name, recipient and group.'},400);const plan=body.plannedPrice===''?null:Number(body.plannedPrice);if(plan!==null&&(!Number.isFinite(plan)||plan<0||plan>1000000))return json({error:'Enter a valid price.'},400);await db.prepare('UPDATE gifts SET name=?,recipient=?,group_id=?,planned_price=?,threshold=? WHERE id=?').bind(name,recipient,group,plan,Math.max(5,Math.min(80,Number(body.threshold)||15)),id).run();return json({ok:true});}
 if(body.action==='delete'){await db.batch([db.prepare('DELETE FROM alerts WHERE gift_id=?').bind(id),db.prepare('DELETE FROM observations WHERE gift_id=?').bind(id),db.prepare('DELETE FROM gifts WHERE id=? AND user_id=?').bind(id,uid)]);return json({ok:true});}
 return json({error:'Unknown action.'},400);
 }catch(e){console.error('dashboard write failed',e);return json({error:e instanceof Error&&e.message==='Use a public HTTPS product link.'?e.message:'Could not save that change. Your form is still available; please try again.'},400);}
}
