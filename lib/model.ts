export type Offer = { id: string; title: string; seller: string; url: string; direct: boolean; price: number; currency: string; oldPrice: number|null; shipping: number|null; delivery: string; deal: string; condition: string; knownRetailer?: boolean; sellerRating: number|null; sellerReviews: number|null; fetchedAt: string; source: string; match: number; score?: number; reasons?: string[]; parts?: Record<string,number> };
export type History = { id: string; gift_id: string; offer_id: string; price: number; currency: string; checked_at: string; seller: string };
export type Gift = { id: string; planned_price: number|null; selected_offer_id: string|null; group_id: string; name: string; recipient: string; query: string; url: string; status: string; threshold: number; offers: Offer[]; current_price: number|null; currency: string; last_checked: string|null; last_success: string|null; error: string|null; created_at: string; history: History[] };
export type Alert = { id: string; gift_id: string; message: string; created_at: string; seen: number };
export function matchProduct(query: string,title: string) { const tokens = query.toLowerCase().match(/[a-z0-9]+/g)||[]; const words = new Set(title.toLowerCase().match(/[a-z0-9]+/g)||[]); return tokens.length? tokens.filter(x=>words.has(x)).length/tokens.length : 0.5; }
export function rankOffers(offers: Offer[], now = Date.now()): Offer[] {
  return offers.map(o=>{
    const peers=offers.filter(p=>p.currency===o.currency && p.match>=0.65);
    const best=Math.min(...(peers.length?peers:[o]).map(p=>p.price+(p.shipping||0)));
    const total=o.price+(o.shipping||0);
    const cost=30*Math.min(1,best/Math.max(total,.01))*(o.shipping===null?.7:1);
    const match=25*o.match;
    // Only store-specific ratings qualify; product ratings never represent seller trust.
    const reliability=o.sellerRating!==null ? 20*(o.sellerRating/5)*Math.min(1,Math.log10(1+(o.sellerReviews||0))/2) : o.knownRetailer ? 13 : 5;
    const discount=o.oldPrice && o.oldPrice>o.price? Math.min(10,10*((o.oldPrice-o.price)/o.oldPrice)/.4):0;
    const days=o.delivery.match(/(\d+)[ -]day/i);
    const delivery=days? (Number(days[1])<=7?5:2):0;
    const age=Math.max(0,(now-Date.parse(o.fetchedAt))/3600000);
    const freshness=age<=6?10:age<=24?7:age<=72?3:0;
    const parts={cost:Math.round(cost),match:Math.round(match),seller:Math.round(reliability),deal:Math.round(discount),delivery,freshness};
    const score=Math.min(100,Math.round(cost+match+reliability+discount+delivery+freshness));
    const reasons=[o.shipping===null?'Shipping is unknown; cost score reduced.':`Price includes ${o.shipping===0?'free shipping':'reported shipping'}; tax is extra.`,`${Math.round(o.match*100)}% of search terms match; verify model, size and condition.`,o.sellerRating===null?o.knownRetailer?'Recognized retail domain; individual marketplace seller still needs checking.':'Seller reputation is unverified; reliability score reduced.':`Seller rating ${o.sellerRating}/5 from ${o.sellerReviews||0} reported reviews.`,o.oldPrice?'Discount uses the seller’s advertised prior price, not our observed history.':'No verified discount amount.',o.deal.match(/bogo|buy.*get/i)?'Bundle/BOGO terms require checking; not treated as a cash discount.':'',!days?'Delivery timing is unknown.':`Reported delivery: ${o.delivery}`,age>24?'Price is stale; verify before buying.':'Recently checked.'].filter(Boolean);
    return {...o,score,parts,reasons};
  }).sort((a,b)=>(b.score||0)-(a.score||0));
}
export function money(n:number|null,currency='USD') { return n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency}).format(n); }



