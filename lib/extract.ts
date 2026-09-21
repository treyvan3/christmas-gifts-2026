import type { Offer } from './model';
export function safeUrl(value:string) {
 const u=new URL(value); const h=u.hostname.toLowerCase();
 if(u.protocol!=='https:'||u.username||u.password|| (u.port&&u.port!=='443') || !h.includes('.') || h.includes(':') || /^\d+(\.\d+)*$/.test(h) || /(^|\.)(localhost|local|internal|test|invalid|example|lan|home|onion)$/.test(h)) throw new Error('Use a public HTTPS product link.');
 u.hash='';return u;
}
async function publicDns(host:string) {
 const r=await fetch('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(host)+'&type=A',{headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(5000)});
 const d=await r.json() as {Answer?:{type:number,data:string}[]};const ips=(d.Answer||[]).filter(x=>x.type===1).map(x=>x.data);
 if(!ips.length||ips.some(ip=>{const [a,b]=ip.split('.').map(Number);return a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19);})) throw new Error('This address is not available for public price checks.');
}
async function page(url:string){
 let u=safeUrl(url);
 for(let i=0;i<4;i++){
  await publicDns(u.hostname);
  const r=await fetch(u.toString(),{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'ChristmasGiftWatch/1.0 (product price monitoring)','Accept':'text/html'}});
  if(r.status>=300&&r.status<400){const location=r.headers.get('location');if(!location)break;u=safeUrl(new URL(location,u).toString());continue;}
  if(!r.ok) throw new Error(`The store did not allow a price check (${r.status}). Your gift is saved; open the store to verify its price.`);
  if(!r.headers.get('content-type')?.includes('text/html'))throw new Error('This link is not a product page.');
  const reader=r.body?.getReader();if(!reader)throw new Error('The store returned an empty page.');let size=0,result='';const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2500000){await reader.cancel();throw new Error('This product page is too large to check reliably.');}result+=decoder.decode(value,{stream:true});}return {html:result,url:u.toString()};
 }throw new Error('This product link redirected too many times.');
}
function decode(s:string){return s.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
export function extractProduct(html:string,url:string):Offer {
 const products:any[]=[];const visit=(x:any)=>{if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(visit);return;}if([].concat(x['@type']||[]).some((t:string)=>/(^|[/:])Product$/.test(t)))products.push(x);if(x['@graph'])visit(x['@graph']);if(x.mainEntity)visit(x.mainEntity);};
 for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{visit(JSON.parse(m[1]));}catch{}}
 const candidates=products.filter(p=>p.offers);
 if(candidates.length>1)throw new Error('Multiple products were found. Use a link to one specific product or variant.');
 const p=candidates[0];let price:number|undefined,currency='',title='',availability='';
 if(p){const offers=Array.isArray(p.offers)?p.offers:[p.offers];const amounts=offers.filter((o:any)=>o.price!==undefined&&o.priceCurrency).map((o:any)=>({price:Number(o.price),currency:o.priceCurrency,availability:o.availability}));
 if(!amounts.length||new Set(amounts.map((o:any)=>o.price+' '+o.currency)).size!==1)throw new Error('No single reliable product price was provided. Select a specific variant at the store.');
 ({price,currency,availability}=amounts[0]);title=p.name||'';
 }else{const metas:Record<string,string>={};for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const attrs:Record<string,string>={};for(const a of m[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g))attrs[a[1].toLowerCase()]=decode(a[2]);metas[attrs.property||attrs.name]=attrs.content;}
 price=Number(metas['product:price:amount']||metas['og:price:amount']);currency=metas['product:price:currency']||metas['og:price:currency'];title=metas['og:title']||'';}
 if(!price||!Number.isFinite(price)||price<=0||!/^[A-Z]{3}$/.test(currency||''))throw new Error('The store does not expose reliable product-price data. Your gift is saved; we’ll retry automatically.');
 if(/OutOfStock|Discontinued|SoldOut/i.test(availability||''))throw new Error('The store reports this product is unavailable. Previous prices are retained.');
 return {id:url,title:title.slice(0,240)||new URL(url).hostname,seller:new URL(url).hostname.replace(/^www\./,''),url,direct:true,price,currency,oldPrice:null,shipping:null,delivery:'Not provided',deal:'',condition:'Verify at store',sellerRating:null,sellerReviews:null,fetchedAt:new Date().toISOString(),source:p?'Store structured data':'Store product metadata',match:1};
}
export async function checkProduct(url:string){const p=await page(url);const o=extractProduct(p.html,p.url);return {...o,id:safeUrl(url).toString()};}
