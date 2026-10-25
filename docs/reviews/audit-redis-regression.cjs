// Isolated provider regression. Requires the labeled disposable Redis on 56390.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { spawn, execFileSync } = require('node:child_process')
const root = path.resolve(__dirname, '../..')
const rr = require('node:module').createRequire(path.join(root, 'package.json'))
const Redis = rr('ioredis'), swc = rr('@swc/core')
const { RedisLockingProvider } = rr('@medusajs/locking-redis/dist/services/redis-lock')
const Cache = rr('@medusajs/cache-redis/dist/services/redis-cache').default
const url = 'redis://127.0.0.1:56390', container = 'vi2-fixes-redis-20261025'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const logger = { info(){}, warn(){}, error(){} }
function load(file) {
  const filename = path.join(root, file), module = { exports: {} }
  const code = swc.transformSync(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'typescript' }, target: 'es2022' }, module: { type: 'commonjs' } }).code
  new Function('require','module','exports',code)(rr,module,module.exports)
  return module.exports
}
async function connect(options={}) {
  const client = new Redis(url, { lazyConnect:true, ...options });client.on('error',()=>{})
  await client.connect();return client
}
async function main() {
  if (process.argv.includes('--hold')) {
    const client=await connect(),lock=new RedisLockingProvider({redisClient:client,logger})
    await lock.execute('audit:crash',async()=>{process.stdout.write('HELD\n');await new Promise(()=>{setInterval(()=>{},1000)})},{timeout:2,expire:1})
    return
  }
  assert.equal(execFileSync('docker',['inspect','--format','{{ index .Config.Labels "vi2.audit" }}',container],{encoding:'utf8'}).trim(),'audit-fixes')
  const config=load('apps/backend/src/lib/redis-config.ts').redisModules({NODE_ENV:'production',REDIS_URL:url})
  const options=config.find(x=>x.resolve.endsWith('/cache-redis')).options.redisOptions
  const client=await connect(options),cache=new Cache({cacheRedisConnection:client},{namespace:'audit-fix'})
  const middleware=load('apps/backend/src/lib/store-cache.ts').cacheStoreGet(60)
  const results={cacheOptions:options};let paused=false
  try {
    execFileSync('docker',['pause',container],{stdio:'pipe'});paused=true
    let fallback=0
    await Promise.all(Array.from({length:150},()=>middleware({method:'GET',originalUrl:'/store/products?limit=24',headers:{},scope:{resolve:()=>cache}},{statusCode:200,json(){},on(){}},()=>fallback++)))
    await sleep(1200)
    const remaining=client.commandQueue.length+client.offlineQueue.length
    assert.equal(fallback,150);assert.ok(remaining<10)
    results.stalledCache={requests:150,fallback,pendingCommandsAfter1200ms:remaining}
    execFileSync('docker',['unpause',container],{stdio:'pipe'});paused=false
    for(let i=0;i<80&&client.status!=='ready';i++)await sleep(50)
    await client.ping()
    client.disconnect()
    await Promise.allSettled(Array.from({length:150},()=>cache.get('offline')))
    assert.equal(client.offlineQueue.length,0)
    results.disconnectedCache={requests:150,offlineQueue:0}
  } finally {if(paused)execFileSync('docker',['unpause',container],{stdio:'pipe'});client.disconnect()}
  const a=await connect(),b=await connect(),one=new RedisLockingProvider({redisClient:a,logger}),two=new RedisLockingProvider({redisClient:b,logger})
  try {
    let active=0,maxActive=0
    await Promise.all([one,two].map(lock=>lock.execute('audit:serial',async()=>{active++;maxActive=Math.max(active,maxActive);await sleep(100);active--},{timeout:2,expire:1})))
    assert.equal(maxActive,1);results.sharedLock={workers:2,maxActive}
    const first=one.execute('audit:renew',async signal=>{await sleep(2600);assert.equal(signal.aborted,false)},{timeout:2,expire:1})
    await sleep(1200)
    await assert.rejects(()=>two.execute('audit:renew',async()=>{}, {timeout:1,expire:1}))
    await first;results.renewal={initialLeaseSeconds:1,handlerMs:2600,competitorTimedOut:true}
    const child=spawn(process.execPath,[__filename,'--hold'],{windowsHide:true,stdio:['ignore','pipe','pipe']})
    try {
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('child lock timeout')),10000);child.stdout.on('data',chunk=>{if(String(chunk).includes('HELD')){clearTimeout(timer);resolve()}});child.once('error',reject);child.once('exit',code=>{if(code)reject(new Error('child failed'))})})
      const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited
      const started=Date.now();await two.execute('audit:crash',async()=>{}, {timeout:3,expire:1})
      results.processCrash={childTerminated:true,reacquiredMs:Date.now()-started}
    }finally{if(child.exitCode===null)child.kill()}
  }finally{a.disconnect();b.disconnect()}
  fs.writeFileSync(path.join(__dirname,'audit-redis-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))
}
main().catch(error=>{console.error(error);process.exitCode=1})
