// Test-only real React renderer, actual cart provider/queue, controlled service boundary.
const path=require('node:path'),fs=require('node:fs'),http=require('node:http'),os=require('node:os')
const root=path.resolve(__dirname,'../..'),esbuild=require('esbuild')
const output=path.join(os.tmpdir(),'vi2-audit-cart-browser-20261025');fs.mkdirSync(output,{recursive:true})
const service=`
const clone=x=>JSON.parse(JSON.stringify(x));
const initial={id:'cart_initial',email:'private@example.invalid',items:[{id:'line_1',productId:'prod_1',variantId:'variant_1',name:'Base',price:100,quantity:1}],total:100,itemSubtotal:100,promotions:[]};
let cart=clone(initial),load,quantity,add;
export const controls={calls:[],releaseLoad(){load?.(clone(initial));},releaseQuantity(){quantity?.();},releaseAdd(){add?.();}};
const log=(name,args=[])=>{controls.calls.push({name,args});window.dispatchEvent(new Event('fixture-changed'));};
export async function getCart(id){log('get',[id]);return new Promise(resolve=>load=resolve);}
export async function createCart(){log('create');cart={...clone(initial),id:'cart_new',email:null};return clone(cart);}
export async function updateCartItem(id,line,n){log('quantity',[id,line,n]);const done=()=>{cart.items.find(x=>x.id===line).quantity=n;cart.total=line==='line_1'?200:380;cart.itemSubtotal=cart.total;return clone(cart);};return line==='line_1'?new Promise(resolve=>quantity=()=>resolve(done())):done();}
export async function addCartItem(id,variant,n){log('add',[id,variant,n]);return new Promise(resolve=>add=()=>{cart.items.push({id:'line_2',productId:'prod_2',variantId:variant,name:'Second',price:80,quantity:n});cart.total=280;cart.itemSubtotal=280;resolve(clone(cart));});}
export async function removeCartItem(){throw new Error('not exercised');}
export async function applyCartPromotion(id,code){log('promotion',[id,code]);cart.total=180;cart.promotions=[{id:'promo',code}];return clone(cart);}
export async function removeCartPromotion(){throw new Error('not exercised');}
export function promoOutcome(){return {ok:true};}
export function promoFailure(){return {ok:false,reason:'unavailable'};}
`
async function main(){
 await esbuild.build({entryPoints:[path.join(__dirname,'audit-cart-fixture.tsx')],outfile:path.join(output,'bundle.js'),bundle:true,platform:'browser',format:'iife',jsx:'automatic',alias:{react:path.join(root,'apps/storefront/node_modules/react'),'react-dom':path.join(root,'apps/storefront/node_modules/react-dom'),'@/lib/medusa/cart-queue':path.join(root,'apps/storefront/src/lib/medusa/cart-queue.ts'),'@/lib/pending-checkout':path.join(root,'apps/storefront/src/lib/pending-checkout.ts')},plugins:[{name:'controlled-services',setup(build){build.onResolve({filter:/^(fixture:cart|@\/lib\/medusa\/services\/cart)$/},()=>({path:'cart',namespace:'fixture'}));build.onResolve({filter:/^\.\/region-provider$/},()=>({path:'region',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='cart'?service:'export const useRegion=()=>({regionId:"reg_eg"});',loader:'js'}));}}]})
 const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(output,'bundle.js')))}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script>')}})
 server.listen(3110,'127.0.0.1',()=>console.log('Fixture ready http://127.0.0.1:3110'))
 process.on('SIGTERM',()=>server.close());process.on('SIGINT',()=>server.close())
}
main().catch(error=>{console.error(error);process.exitCode=1})
