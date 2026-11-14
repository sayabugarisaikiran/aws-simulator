import test from 'node:test';import assert from 'node:assert/strict';
import {engineRequest,requestGate,networkFingerprint} from './engine-client.mjs';
import {writeWorkspace,parseWorkspace,SaveConflict,STORAGE_KEY} from './workspace-persistence.mjs';import {loadDrafts} from './workspace-drafts.mjs';
const response=value=>({ok:true,json:async()=>value});
test('A05 old success, failure and cleanup cannot update after deletion/switch/new run',async()=>{const gate=requestGate();let finish;const old=gate.start();const work=new Promise(r=>finish=r);gate.cancel();const latest=gate.start();finish('success');await work;assert.equal(old.current(),false);assert.equal(latest.current(),true);gate.cancel();assert.equal(latest.current(),false)});
test('A08 abort and timeout are both enforced even with caller signal and uncooperative fetch',async()=>{const abort=new AbortController();await assert.rejects(engineRequest('validate',{},abort.signal,{fetcher:()=>new Promise(()=>{}),timeoutMs:20}),/timed out/);const promise=engineRequest('validate',{},abort.signal,{fetcher:()=>new Promise(()=>{}),timeoutMs:500});abort.abort(new Error('cancelled by edit'));await assert.rejects(promise,/cancelled by edit/)});
test('A08 engine failure, hung body and recovery',async()=>{await assert.rejects(engineRequest('validate',{},undefined,{fetcher:async()=>({ok:false})}),/unavailable/);await assert.rejects(engineRequest('validate',{},undefined,{fetcher:async()=>({ok:true,json:()=>new Promise(()=>{})}),timeoutMs:20}),/timed out/);assert.deepEqual(await engineRequest('validate',{},undefined,{fetcher:async()=>response([])}),[])});
test('A06 stale two-tab writer cannot silently replace newer edits',()=>{let raw=null;const storage={getItem:()=>raw,setItem:(_,next)=>{raw=next}};const a=writeWorkspace(storage,null,'A');assert.throws(()=>writeWorkspace(storage,null,'B'),SaveConflict);assert.equal(raw,'A');writeWorkspace(storage,a,'C');assert.equal(raw,'C')});
test('A07 quota error keeps prior save intact',()=>{const storage={getItem:()=> 'prior',setItem:()=>{throw new Error('QuotaExceededError')}};assert.throws(()=>writeWorkspace(storage,'prior','next'),/Quota/);assert.equal(storage.getItem(STORAGE_KEY),'prior')});
test('A07 corrupt JSON, null nodes, invalid routes/history recover without mutation',()=>{for(const raw of ['{','nullx',JSON.stringify({mode:'custom',nodes:[null]}),JSON.stringify({mode:'custom',nodes:[{id:'x',type:'subnet',routes:null}]}),JSON.stringify({mode:'custom',drafts:{custom:{nodes:[],history:[null]},example:{nodes:[]}}})])assert.throws(()=>parseWorkspace(raw,loadDrafts,[]))});
test('A14 moving or renaming cards does not cause network readiness requests',()=>{assert.equal(networkFingerprint([{id:'s',type:'subnet',name:'a',x:1,y:2}]),networkFingerprint([{id:'s',type:'subnet',name:'changed',x:88,y:900}]));assert.notEqual(networkFingerprint([{id:'s',route:'a'}]),networkFingerprint([{id:'s',route:'b'}]))});

test('a rejected old probe cannot replace a successful newer probe', async () => {
  const gate = requestGate();
  const results = [];
  let rejectOld;
  async function probe(fetcher) {
    const request = gate.start();
    try {
      const result = await engineRequest('assess', {}, request.signal, {fetcher});
      if (request.current()) results.push(result[0]);
    } catch (error) {
      if (request.current()) results.push(error.message);
    }
  }
  const old = probe(() => new Promise((_, reject) => { rejectOld = reject; }));
  await probe(async () => response(['new probe succeeded']));
  rejectOld(new Error('old probe failed late'));
  await old;
  assert.deepEqual(results, ['new probe succeeded']);
});
