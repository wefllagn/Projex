import {readFile,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPrismaClient} from '../../projex-presentation/server/dist/infrastructure/database/prisma.js';
export {assert,randomUUID,delay};
export const root=new URL('../',import.meta.url), users=JSON.parse(await readFile(new URL('private/accounts.json',root),'utf8'));
export const db=createPrismaClient('postgresql://presentation_local@127.0.0.1:55490/projex_presentation');
const [id]=await db.$queryRaw`SELECT current_database() AS name,current_user AS actor,inet_server_port() AS port`;
assert.equal(id.name,'projex_presentation');assert.equal(id.actor,'presentation_local');assert.equal(id.port,55490);
const {execFileSync}=await import('node:child_process');
assert.equal(execFileSync('psql',['-h','127.0.0.1','-p','55490','-U','stage1_qa','-d','postgres','-Atc','SHOW data_directory'],{encoding:'utf8'}).trim(),new URL('../presentation-qa-20261023/pgdata',root).pathname.replace(/\/$/,''));
assert.equal(await db.$queryRaw`SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`.then(r=>r[0].n),28);
const servicePids=JSON.parse(await readFile(new URL('private/pids.json',root),'utf8'));
assert(execFileSync('/usr/sbin/lsof',['-t','-iTCP:3022','-sTCP:LISTEN'],{encoding:'utf8'}).trim().split('\n').includes(String(servicePids.api)),'Presentation API is not the recorded primary service; do not mutate while a restored environment is active');
const stateFile=new URL('private/dataset-state.json',root);
export const state=JSON.parse(await readFile(stateFile,'utf8').catch(()=> '{}'));
export async function save(){await writeFile(stateFile,JSON.stringify(state,null,2)+'\n',{mode:0o600});}
export async function ensure(key,action){if(state[key]!==undefined)return state[key];state[key]=await action();await save();return state[key];}
export async function wait(load,check,label){for(let i=0;i<400;i++){const r=await load();if(check(r))return r;await delay(150);}throw Error('Timed out: '+label);}
export async function client(key,login=true){
 const jar=new Map();
 async function call(method,path,body,expected=200,headers={}){
  const opt={method,headers:{Origin:'http://localhost:5196',...headers}};
  if(jar.size)opt.headers.Cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');
  if(method!=='GET'){opt.headers['Content-Type']='application/json';if(jar.has('projex_csrf'))opt.headers['X-CSRF-Token']=decodeURIComponent(jar.get('projex_csrf'));opt.body=JSON.stringify(body??{});}
  const response=await fetch('http://localhost:3022/api/v1'+path,opt);
  for(const cookie of response.headers.getSetCookie()){const p=cookie.split(';')[0],i=p.indexOf('=');jar.set(p.slice(0,i),p.slice(i+1));}
  const raw=await response.text();const data=raw?JSON.parse(raw):{};
  if(!(Array.isArray(expected)?expected:[expected]).includes(response.status))throw Error(`${key} ${method} ${path}: ${response.status} ${data.error?.code??''}; ${(data.error?.details?.issues??[]).map(x=>JSON.stringify(x.path)).join(',')}`);
  return data;
 }
 if(login){await call('POST','/auth/login',{email:users[key].email,password:users[key].password});const me=(await call('GET','/auth/me')).data;assert.equal(me.email,users[key].email);}
 return {call,get:async p=>(await call('GET',p)).data,post:async(p,b,s=200,k)=>(await call('POST',p,b,s,k?{'Idempotency-Key':k}:{})).data,put:async(p,b)=>(await call('PUT',p,b)).data,patch:async(p,b)=>(await call('PATCH',p,b)).data};
}
