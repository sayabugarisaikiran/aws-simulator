export async function engineCall(action:'validate'|'simulate',data:Record<string,unknown>,signal?:AbortSignal):Promise<any[]>{
 const response=await fetch('/api/engine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data}),signal:signal??AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Local Rust engine unavailable. Start the app with npm run dev.');
 const result:any=await response.json();if(!Array.isArray(result))throw new Error(result.error||'Unexpected response from Rust engine');return result;
}
