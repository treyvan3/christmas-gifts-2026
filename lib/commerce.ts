import { settings } from './db';
import { matchProduct, rankOffers, type Offer } from './model';
import { safeUrl } from './extract';
async function search(params:Record<string,string>){const key=settings().SERPAPI_KEY;if(!key)throw new Error('Shopping search is awaiting its data connection. You can save this idea now or add a store link.');const u=new URL('https://serpapi.com/search.json');Object.entries({...params,api_key:key,hl:'en',gl:'us'}).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{signal:AbortSignal.timeout(18000)});if(!r.ok)throw new Error('Shopping search is temporarily unavailable or has reached its allowance. Saved offers are retained.');const d=await r.json() as any;if(d.error)throw new Error('Shopping search returned no usable data. Try a more specific product name, or check the data connection.');return d;}
const reliableDomains=['bestbuy.com','target.com','walmart.com','costco.com','bhphotovideo.com','homedepot.com','lowes.com','apple.com','lego.com','nintendo.com','sony.com','nike.com','adidas.com','rei.com','nordstrom.com','macys.com'];
export function retailerIdentity(url:string){try{const h=new URL(url).hostname;return reliableDomains.some(x=>h===x||h.endsWith('.'+x));}catch{return false;}}
function normalize(p:any,query:string,base?:any):Offer|null{try{
 const direct=!!p.link; const url=safeUrl(p.link||p.product_link).toString();const price=Number(p.extracted_price);
 if(!Number.isFinite(price)||price<=0||p.installment||p.monthly_payment_duration||/\/mo|per month|monthly/i.test(p.price||'')||!/^\$[\d,]/.test(p.price||''))return null;
 const title=String(p.title||base?.title||'Product').slice(0,240);const delivery=String(p.delivery||(p.details_and_offers||[]).filter((x:string)=>/deliver|shipping/i.test(x)).join(' · ')||'Not provided');
 const shipping=typeof p.shipping_extracted==='number'?p.shipping_extracted: /^free$/i.test(p.shipping||'')||/^free (delivery|shipping)$/i.test(delivery)?0:null;
 const deal=[p.discount,p.coupon&&`Coupon: ${p.coupon}`,p.tag,...(p.extensions||[]),...(p.details_and_offers||[]).filter((x:string)=>/bogo|buy.*get|%|off|coupon/i.test(x))].filter(Boolean).join(' · ').slice(0,600);
 const stable=new URL(url);['srsltid','gclid','utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(x=>stable.searchParams.delete(x));
 return {id:stable.toString(),title,seller:String(p.name||p.source||new URL(url).hostname).slice(0,120),url,direct,price,currency:'USD',oldPrice:Number(p.extracted_original_price||p.extracted_old_price)||null,shipping,delivery,deal,condition:p.second_hand_condition||'Check size, variant & condition',sellerRating:typeof p.store_rating==='number'?p.store_rating:null,sellerReviews:typeof p.store_reviews==='number'?p.store_reviews:null,fetchedAt:new Date().toISOString(),source:'SerpApi · Google Shopping',match:matchProduct(query,title),knownRetailer:retailerIdentity(url)} as Offer;
 }catch{return null;}}
export async function discover(query:string){const d=await search({engine:'google_shopping',q:query});const rows=(d.shopping_results||[]).filter((x:any)=>!x.installment).slice(0,12);let offers=rows.map((x:any)=>normalize(x,query)).filter(Boolean) as Offer[];
 // Resolve store purchase links for the three strongest product matches.
 const detail=rows.filter((x:any)=>x.immersive_product_page_token).sort((a:any,b:any)=>matchProduct(query,b.title||'')-matchProduct(query,a.title||'')).slice(0,3);
 const settled=await Promise.allSettled(detail.map(async(p:any)=>{const data=await search({engine:'google_immersive_product',page_token:p.immersive_product_page_token,more_stores:'true'});return (data.product_results?.stores||[]).map((s:any)=>normalize(s,query,p)).filter(Boolean) as Offer[];}));
 for(const r of settled)if(r.status==='fulfilled')offers.push(...r.value);
 offers=[...new Map(offers.map(o=>[o.id,o])).values()];if(!offers.length)throw new Error('No reliable one-time USD offers were found. Try a model number, brand, or direct store link.');return rankOffers(offers).slice(0,20);}
