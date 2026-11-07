import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
const cargo=process.env.CARGO_BIN||(existsSync(join(homedir(),'.cargo/bin/cargo'))?join(homedir(),'.cargo/bin/cargo'):'cargo');
const engine=spawn(cargo,['run','--manifest-path','engine/Cargo.toml'],{stdio:'inherit'});let ui;let exiting=false;
function shutdown(code=0){if(exiting)return;exiting=true;ui?.kill('SIGTERM');engine.kill('SIGTERM');process.exitCode=code;}
process.on('SIGINT',()=>shutdown());process.on('SIGTERM',()=>shutdown());engine.on('error',e=>{console.error('Rust engine could not start:',e.message);shutdown(1)});engine.on('exit',code=>{if(!exiting)shutdown(code||1)});
for(let i=0;i<300&&!exiting;i++){try{const response=await fetch('http://127.0.0.1:5180/health');const health=await response.json();if(health.engine==='rust'){ui=spawn(process.execPath,['scripts/run-framework.mjs','dev'],{stdio:'inherit'});ui.on('exit',code=>shutdown(code||0));break}}catch{}await new Promise(r=>setTimeout(r,500));}
if(!ui&&!exiting){console.error('Rust engine did not become ready.');shutdown(1)}
