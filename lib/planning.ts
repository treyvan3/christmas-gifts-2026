import { type Gift, type Offer } from './model';
export function nextBlackFriday(now=new Date()) {
 const day=now.toLocaleDateString('en-CA',{timeZone:'America/New_York'});const year=Number(day.slice(0,4));
 const target=(y:number)=>{const first=new Date(Date.UTC(y,10,1));return new Date(Date.UTC(y,10,1+(4-first.getUTCDay()+7)%7+22));};
 let date=target(year);if(day>date.toISOString().slice(0,10))date=target(year+1);
 const today=new Date(day+'T00:00:00Z');return {date,days:Math.round((date.getTime()-today.getTime())/86400000),rolled:date.getUTCFullYear()>year};
}
export function chosenOffer(g:Gift):Offer|undefined{return g.offers.find(o=>o.id===g.selected_offer_id)||g.offers[0];}
export function plannedCost(g:Gift):number|null{const o=chosenOffer(g);if(g.planned_price!==null)return g.planned_price;if(g.currency!=='USD')return null;return o?o.price+(o.shipping||0):g.current_price;}
export function valueAdvice(g:Gift,budget:number,over:boolean){const cost=plannedCost(g),o=chosenOffer(g);const fresh=(p:Offer)=>Date.now()-Date.parse(p.fetchedAt)<24*3600000;
 const comparable=o&&o.shipping!==null&&fresh(o)?g.offers.filter(p=>p.id!==o.id&&p.currency===o.currency&&p.shipping!==null&&p.match>=.85&&p.match>=o.match-.05&&p.condition===o.condition&&fresh(p)&&p.direct&&(p.knownRetailer||p.sellerRating!==null)&&p.price+p.shipping<o.price+(o.shipping||0)).sort((a,b)=>(a.price+(a.shipping||0))-(b.price+(b.shipping||0)))[0]:undefined;
 const savings=o&&comparable?Math.round(((o.price+(o.shipping||0))-(comparable.price+(comparable.shipping||0)))*100)/100:0;
 const history=o?g.history.filter(h=>h.offer_id===o.id&&h.currency===o.currency):[];const peak=history.length?Math.max(...history.map(h=>h.price)):0;const drop=o&&peak?Math.round((peak-o.price)/peak*100):0;
 const impact=cost!==null&&budget>0?cost/budget:0;const review=over&&(impact>.15||(o?.score||0)<60);const early=!!o&&fresh(o)&&o.match>=.85&&drop>=g.threshold&&(o.score||0)>=65&&!!o.direct;
 return {cost,comparable,savings,drop,impact,early,priority:g.status==='purchased'?0:savings+(review?Math.max(cost||0,1)*.25:0),label:g.status==='purchased'?'Purchased':savings>0?'Cheaper candidate':review?'Review budget impact':early?'Consider buying early':'Watch until Black Friday',detail:savings>0?'A lower-cost candidate is available. Confirm the model, variant and seller before switching.':review?'This gift has a high budget impact or incomplete value signals. Seek a cheaper option; no verified savings estimate yet.':early?`Observed price is down ${drop}% and the offer scores ${o?.score}/100. Verify the store price before buying early.`:drop>0?`Observed price is down ${drop}%. Keep watching unless the product match and total cost check out.`:'No compelling, verified early-buy signal yet.'};
}

