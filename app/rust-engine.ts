import {engineRequest} from './engine-client.mjs';
export function engineCall(action:'validate'|'simulate'|'assess'|'assess_all',data:Record<string,unknown>,signal?:AbortSignal):Promise<any[]>{return engineRequest(action,data,signal)}
