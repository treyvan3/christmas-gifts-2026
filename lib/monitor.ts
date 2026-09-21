import { database } from './db';
import { discover } from './commerce';
import { checkProduct } from './extract';
import { rankOffers, money, type Offer } from './model';
import { nextBlackFriday } from './planning';
export async function refreshGift(g:any,force=false){
 const db=database(), now=new Date().toISOString(),cutoff=new Date(Date.now()-(force?60000:6*3600000)).toISOString();
 const claimed=await db.prepare('UPDATE gifts SET last_checked=? WHERE id=? AND (last_checked IS NULL OR last_checked < ?)').bind(now,g.id,cutoff).run();if(!claimed.meta.changes)return false;
 try{const offers=rankOffers(g.url?[await checkProduct(g.url)]:await discover(g.query));const prior=JSON.parse(g.offers||'[]') as Offer[];const statements:D1PreparedStatement[]=[];
 for(const o of offers){
  // Baseline is the highest price actually observed for this exact offer and currency.
  const baseline=await db.prepare('SELECT MAX(price) AS peak FROM observations WHERE gift_id=? AND offer_id=? AND currency=?').bind(g.id,o.id,o.currency).first<{peak:number|null}>();
  const before=prior.find(p=>p.id===o.id&&p.currency===o.currency);const peak=baseline?.peak;
  if(peak&&before&&o.price<before.price&&((peak-o.price)/peak)*100>=g.threshold&&o.match>=.65){
   const pct=Math.round((peak-o.price)/peak*100);const early=nextBlackFriday().days>0?'Price drop before Black Friday':'Black Friday price drop';
   statements.push(db.prepare('INSERT INTO alerts (id,user_id,gift_id,message,created_at,seen) VALUES (?,?,?,?,?,0)').bind(crypto.randomUUID(),g.user_id,g.id,`${early}: ${g.name} at ${o.seller} is ${money(o.price,o.currency)}, ${pct}% below your observed high of ${money(peak,o.currency)}. Check shipping and the product match before buying.`,now));
  }
  statements.push(db.prepare('INSERT INTO observations (id,gift_id,offer_id,price,currency,seller,checked_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),g.id,o.id,o.price,o.currency,o.seller,now));
 }
 const chosen=offers.find(o=>o.id===g.selected_offer_id)||offers[0];
 statements.push(db.prepare('UPDATE gifts SET offers=?,current_price=?,currency=?,last_success=?,error=NULL WHERE id=?').bind(JSON.stringify(offers),chosen.price,chosen.currency,now,g.id));
 await db.batch(statements);return true;
 }catch(e){const message=e instanceof Error?e.message:'Price check failed. Your previous prices are retained.';await db.prepare('UPDATE gifts SET error=? WHERE id=?').bind(message.slice(0,500),g.id).run();return false;}
}
