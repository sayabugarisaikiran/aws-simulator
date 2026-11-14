'use client';
import {useState,useEffect,useRef,useLayoutEffect,useMemo} from 'react';
import type {PointerEvent} from 'react';
import {ArrowLeft,Box,Network,Route,Globe,ArrowRightLeft,Shield,MapPin,Plus,Play,RotateCcw,ChevronRight,Check,ArrowUpRight,Layers,SlidersHorizontal,Trash2,X,MousePointer2,ZoomIn,ZoomOut,Move3D,Download,Info,Undo2,Focus} from 'lucide-react';
import {types as resourceTypes,example} from '../model.mjs';
import {emptyDraft,loadDrafts,saveDraft} from '../workspace-drafts.mjs';
import {engineCall} from '../rust-engine';
import {requestGate,networkFingerprint} from '../engine-client.mjs';
import {STORAGE_KEY,writeWorkspace,parseWorkspace} from '../workspace-persistence.mjs';
import { planeDelta, remember } from '../workspace-controls.mjs';
import {cameraOrbit} from '../scene-layout.mjs';
import {canvasNodes,subnetPosition,removeResource} from '../topology-layout.mjs';
const orbitView=(start:any,dx:number,dy:number)=>cameraOrbit(start,dx,-dy);
const types:Record<string,string>=resourceTypes;
const icons:any={vpc:Box,subnet:Layers,route:Route,igw:Globe,nat:ArrowRightLeft,eip:MapPin,acl:Shield};
const hints:any={vpc:'Your isolated cloud network',subnet:'A range of addresses in your VPC',route:'Decide where packets go',igw:'Connect your VPC to the internet',nat:'Outbound access for private subnets',eip:'A static public IPv4 allocation',acl:'Control traffic at subnet boundaries'};
const colors:any={vpc:'violet',subnet:'blue',route:'orange',igw:'green',nat:'orange',eip:'violet',acl:'pink'};
export default function VpcWorkspace(){const [errors,setErrors]=useState<string[]>([]);const [engineBusy,setEngineBusy]=useState(true);const [engineFailure,setEngineFailure]=useState('');const [nodes,setNodes]=useState<any[]>(()=>example(true));const [selected,setSelected]=useState('vpc');const [mode,setMode]=useState('example');const [traffic,setTraffic]=useState(true);const [steps,setSteps]=useState<any[]>([]);const [current,setCurrent]=useState(-1);const [running,setRunning]=useState(false);const [source,setSource]=useState('private');const [destination,setDestination]=useState('1.1.1.1');const [port,setPort]=useState('443');const [zoom,setZoom]=useState(.8);const [angle,setAngle]=useState(-16);const [tilt,setTilt]=useState(35);const [notice,setNotice]=useState('');const [checks,setChecks]=useState(false);const [ready,setReady]=useState(false);const drafts=useRef<any>({example:emptyDraft(example(true)),custom:emptyDraft()});const [access,setAccess]=useState<any[]>([]);const [accessPending,setAccessPending]=useState(true);const runGate=useRef(requestGate());const [runPending,setRunPending]=useState(false);const [engineEpoch,setEngineEpoch]=useState(0);const [saveError,setSaveError]=useState('');const [saveStatus,setSaveStatus]=useState('Loading saved workspace…');const savedRaw=useRef<string|null>(null);const saveBlocked=useRef(false);const [saveEpoch,setSaveEpoch]=useState(0);const timer=useRef<any>(null);const drag=useRef<any>(null);const orbit=useRef<any>(null);const sceneRef=useRef<HTMLDivElement>(null);const canvasRef=useRef<HTMLDivElement>(null);const editSession=useRef(false);const [history,setHistory]=useState<any[]>([]);const [orbiting,setOrbiting]=useState(false);
function checkpoint(){setHistory(h=>remember(h,{nodes,selected,mode,source}));}
function undo(){const previous=history.at(-1);if(!previous)return;stop();setNodes(previous.nodes);setSelected(previous.selected||'');setSource(previous.source||'');setHistory(h=>h.slice(0,-1));editSession.current=false;}
function resetView(){setAngle(-16);setTilt(35);setZoom(.8);}
function finishOrbit(){orbit.current=null;setOrbiting(false);}

function snapshot(){return {nodes,selected,source,history,zoom,angle,tilt};}
function restore(draft:any){setNodes(draft.nodes);setSelected(draft.selected||'');setSource(draft.source||'');setHistory(draft.history||[]);setZoom(draft.zoom??.8);setAngle(draft.angle??-16);setTilt(draft.tilt??35);}
function download(value:string,filename:string){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([value],{type:'application/json'}));a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
function loadSaved(workspace?: "example" | "custom"){stop();try{const raw=localStorage.getItem(STORAGE_KEY);const loaded=parseWorkspace(raw,loadDrafts,example(true));savedRaw.current=raw;drafts.current=loaded.drafts;const target=workspace??loaded.mode;setMode(target);restore(loaded.drafts[target]);saveBlocked.current=false;setSaveError('');setSaveEpoch(e=>e+1)}catch(e){saveBlocked.current=true;setSaveStatus('Saving paused');if(workspace){setMode(workspace);restore(drafts.current[workspace]);}setSaveError('Saved data could not be loaded. Original data is preserved. '+(e instanceof Error?e.message:''))}}
useEffect(()=>{const entry=new URLSearchParams(window.location.search).get("workspace");loadSaved(entry==="example"||entry==="custom"?entry:undefined);setReady(true);const changed=(event:StorageEvent)=>{if((event.key===STORAGE_KEY||event.key===null)&&event.newValue!==savedRaw.current){saveBlocked.current=true;setSaveStatus('Saving paused');setSaveError('Another tab changed the saved workspace. Export your edits or load the saved version.')}};window.addEventListener('storage',changed);return()=>{clearInterval(timer.current);runGate.current.cancel();window.removeEventListener('storage',changed)}},[]);
function serializedWorkspace(){
  return JSON.stringify({version:2,nodes,mode,drafts:saveDraft(drafts.current,mode,snapshot())});
}

async function saveWorkspace(next:string, cancelled=()=>false){
  const persist=()=>{
    if(cancelled()||saveBlocked.current)return false;
    savedRaw.current=writeWorkspace(localStorage,savedRaw.current,next);
    setSaveStatus('Saved on this browser');
    return true;
  };
  try{
    return navigator.locks ? await navigator.locks.request(STORAGE_KEY,persist) : persist();
  }catch(error){
    if(!cancelled()){
      saveBlocked.current=true;
      setSaveStatus('Saving paused');
      setSaveError('Unable to save. Your edits remain in this tab. Export a copy. '+(error instanceof Error?error.message:''));
    }
    return false;
  }
}

useEffect(()=>{
  if(!ready)return;
  drafts.current=saveDraft(drafts.current,mode,snapshot());
  if(saveBlocked.current)return;
  let cancelled=false;
  setSaveStatus('Saving…');
  const next=serializedWorkspace();
  const saveTimer=setTimeout(()=>void saveWorkspace(next,()=>cancelled),200);
  return()=>{cancelled=true;clearTimeout(saveTimer)};
},[nodes,mode,ready,selected,source,history,zoom,angle,tilt,saveEpoch]);

async function returnToServices(){
  if(!ready)return;
  if(saveBlocked.current){
    document.querySelector<HTMLButtonElement>('.save-warning button')?.focus();
    return;
  }
  if(await saveWorkspace(serializedWorkspace()))window.location.assign('/');
}

const networkKey=useMemo(()=>networkFingerprint(nodes),[nodes]);
useEffect(()=>{const controller=new AbortController();setAccessPending(true);setAccess([]);const timer=setTimeout(async()=>{try{const reports=await engineCall('assess_all',{nodes,destination:'1.1.1.1',port:443},controller.signal);if(!controller.signal.aborted)setAccess(reports.map(r=>({id:r.subnetId,...r})))}catch{if(!controller.signal.aborted)setAccess([])}finally{if(!controller.signal.aborted)setAccessPending(false)}},350);return()=>{clearTimeout(timer);controller.abort()}},[networkKey,mode,engineEpoch]);
useEffect(()=>{if(notice){const t=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(t)}},[notice]);
useEffect(()=>{const controller=new AbortController();setEngineBusy(true);const timer=setTimeout(()=>{engineCall('validate',{nodes},controller.signal).then(result=>{if(!controller.signal.aborted){setErrors(result);setEngineFailure('')}}).catch(e=>{if(!controller.signal.aborted)setEngineFailure(e.message)}).finally(()=>{if(!controller.signal.aborted)setEngineBusy(false)})},180);return()=>{clearTimeout(timer);controller.abort()}},[networkKey,mode,engineEpoch]);
// A non-passive native listener prevents browser/page zoom only inside the canvas.
useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;const wheel=(event:WheelEvent)=>{if((event.target as HTMLElement).closest('.checks'))return;event.preventDefault();event.stopPropagation();const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1);setZoom(z=>Math.max(.4,Math.min(1.8,z*Math.exp(-delta*.002))))};canvas.addEventListener('wheel',wheel,{passive:false});return()=>canvas.removeEventListener('wheel',wheel)},[]);
// Read projected bounds before applying visibility to avoid interleaving layout reads and writes.
function arrangeLabels(){
  const scene=sceneRef.current;
  if(!scene)return;
  const labels=Array.from(scene.querySelectorAll<HTMLElement>('[data-map-label]'));
  labels.sort((a,b)=>Number(a.dataset.priority||3)-Number(b.dataset.priority||3));
  const occupied:DOMRect[]=[];
  for(const label of labels){
    const rect=label.getBoundingClientRect();
    if(!rect.width||!rect.height)continue;
    const overlap=occupied.some(r=>rect.left<r.right+4&&rect.right>r.left-4&&rect.top<r.bottom+3&&rect.bottom>r.top-3);
    label.style.visibility=overlap?'hidden':'';
    if(!overlap)occupied.push(rect);
  }
}

useLayoutEffect(arrangeLabels,[nodes,selected,zoom,angle,tilt,mode]);
useEffect(()=>{
  const canvas=canvasRef.current;
  if(!canvas)return;
  let live=true;
  const observer=new ResizeObserver(arrangeLabels);
  observer.observe(canvas);
  document.fonts.ready.then(()=>{if(live)arrangeLabels()});
  return()=>{live=false;observer.disconnect()};
},[]);

const touches=useRef(new Map<number,{x:number;y:number}>());
const pinch=useRef<{distance:number;zoom:number}|null>(null);

function touchDistance(){
  const [a,b]=touches.current.values();
  return a&&b ? Math.hypot(a.x-b.x,a.y-b.y) : 0;
}

function startTouch(event:PointerEvent<HTMLDivElement>){
  if(event.pointerType!=='touch'||(event.target as Element).closest('.view-controls,.checks'))return;
  touches.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
  const distance=touchDistance();
  if(touches.current.size===2&&distance>0){
    pinch.current={distance,zoom};
    for(const id of touches.current.keys())event.currentTarget.setPointerCapture(id);
    drag.current=null;
    finishOrbit();
    event.stopPropagation();
  }
}

function moveTouch(event:PointerEvent<HTMLDivElement>){
  if(!touches.current.has(event.pointerId))return;
  touches.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(!pinch.current)return;
  const distance=touchDistance();
  if(distance)setZoom(Math.max(.4,Math.min(1.8,pinch.current.zoom*distance/pinch.current.distance)));
  event.stopPropagation();
}

function endTouch(event:PointerEvent<HTMLDivElement>){
  touches.current.delete(event.pointerId);
  if(!touches.current.size)pinch.current=null;
}

const active=nodes.find(n=>n.id===selected);const subs=nodes.filter(n=>n.type==='subnet');const stop=()=>{runGate.current.cancel();setRunPending(false);clearInterval(timer.current);setRunning(false);setSteps([]);setCurrent(-1)};const update=(key:string,value:any)=>{stop();const element=document.activeElement;const typing=element instanceof HTMLInputElement&&element.type!=='checkbox';if(!typing||!editSession.current){checkpoint();editSession.current=typing;}setNodes(ns=>ns.map(n=>n.id===selected?{...n,[key]:value}:n));};
function add(type:string){if(type==='vpc'&&nodes.some(n=>n.type==='vpc')){setSelected(nodes.find(n=>n.type==='vpc').id);setNotice('This workspace supports one VPC. Select it to edit its settings.');return;}if(type!=='vpc'&&!nodes.some(n=>n.type==='vpc')){setNotice('Add a VPC first.');return;}stop();checkpoint();const id=crypto.randomUUID();setNodes(ns=>[...ns,{id,type,name:'',cidr:'',x:130+(ns.length%4)*170,y:140+Math.floor(ns.length/4)*145,routes:[],rules:[],attached:false,subnet:'',eip:'',route:'',acl:'',publicIp:false}]);setSelected(id);}
function reset(empty:boolean){const target=empty?'custom':'example';if(target===mode)return;stop();drafts.current=saveDraft(drafts.current,mode,snapshot());restore(drafts.current[target]);setMode(target);setChecks(false);}
function clearCustom(){stop();checkpoint();setNodes([]);setSelected('');setSource('');setChecks(false);}
async function run(){stop();const ticket=runGate.current.start();setRunPending(true);try{const [report]=await engineCall('assess',{nodes,subnetId:source,destination,port:+port},ticket.signal);if(!ticket.current())return;const next=report.steps;setEngineFailure('');setSteps(next);setCurrent(0);setRunning(true);let i=0;timer.current=setInterval(()=>{i++;if(i>=next.length){clearInterval(timer.current);setRunning(false);return;}setCurrent(i)},1800)}catch(e){if(ticket.current()){setAccess([]);setEngineFailure(e instanceof Error?e.message:'Rust engine failed')}}finally{if(ticket.current())setRunPending(false)}}


const select=(label:string,key:string,type:string)=> <label>{label}<select value={active?.[key]||''} onChange={e=>update(key,e.target.value)}><option value="">{type==='acl'?'No custom NACL layer (default ACL)':`Select ${types[type].toLowerCase()}`}</option>{nodes.filter(n=>n.type===type).map(n=><option key={n.id} value={n.id}>{n.name||`Unnamed ${types[type]}`}</option>)}</select></label>;
const field=(label:string,key:string,placeholder:string)=> <label>{label}<input value={active?.[key]||''} placeholder={placeholder} onChange={e=>update(key,e.target.value)}/></label>;
const name=(n:any)=>n?.name||`Unnamed ${types[n?.type]||'component'}`;
const positionedNodes=useMemo(()=>canvasNodes(nodes),[nodes]);
const byId=new Map(positionedNodes.map(node=>[node.id,node]));
const connections=positionedNodes.flatMap(a=>{
  const targets=a.type==='subnet'?[a.route]:a.type==='route'?(a.routes||[]).map((r:any)=>r.target):a.type==='nat'?[a.eip]:[];
  return targets.flatMap((id:string)=>{
    const b=byId.get(id);
    return b&&a.x!==undefined&&a.y!==undefined&&b.x!==undefined&&b.y!==undefined?[{a,b}]:[];
  });
});
const center=(node:any)=>({x:node.x+(node.insetSize??126)/2,y:node.y+(node.insetSize??72)/2});

return <main><header className="vpc-header"><div className="brand"><span className="brand-mark"><Network size={23}/></span>vpc<span className="brand-light">lab</span><span className="preview">PREVIEW 01</span></div><nav className="breadcrumb" aria-label="Workspace navigation"><a className="services-back" href="/" onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();void returnToServices()}}><ArrowLeft size={14} aria-hidden="true"/> All services</a><ChevronRight size={13} aria-hidden="true"/> <span>VPC</span></nav><div className="head-actions"><span className="local-dot"/> {saveStatus}<button className="export" onClick={()=>{const blob=new Blob([JSON.stringify({nodes},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='vpc-workspace.json';a.click();URL.revokeObjectURL(a.href)}}><Download size={15}/> Export</button></div></header>
<div className="app"><aside className="palette"><div className="section-eyebrow">BUILD YOUR NETWORK</div><h2>Components <span>07</span></h2><p className="muted">Drag onto the canvas or click to add.</p><div className="components">{Object.entries(types).map(([type,label]:any)=>{const Icon=icons[type];return <button key={type} className="component" draggable onDragStart={e=>e.dataTransfer.setData('component',type)} onClick={()=>add(type)}><span className={`icon ${colors[type]}`}><Icon size={20}/></span><span><strong>{label}</strong><small>{hints[type]}</small></span><Plus size={13}/></button>})}</div><div className="palette-note"><span className="tiny-tag">LEARN BY DOING</span><h3>A network you can see.</h3><p>Build, configure, then follow a packet to understand what happens along the way.</p><div className="mini-path"><Box size={17}/><span>······</span><Shield size={17}/><span>······</span><Globe size={17}/></div></div><div className="palette-bottom"><span className="local-dot"/> Learning sandbox · No AWS resources</div></aside>
<section className="workspace"><div className="workspace-bar"><div><div className="section-eyebrow">YOUR WORKSPACE</div><h1>One VPC. Endless possibilities.</h1></div><button className={`validate ${checks?'selected':''}`} onClick={()=>setChecks(!checks)}><Check size={15}/> Validate <span>{engineFailure?'!':engineBusy?'…':errors.length||'✓'}</span></button></div><div className="canvas-tools"><div className="segmented workspace-switch" role="group" aria-label="Choose workspace"><button className={mode==='example'?'on':''} aria-pressed={mode==='example'} onClick={()=>reset(false)}>Example network</button><button className={mode==='custom'?'on':''} aria-pressed={mode==='custom'} onClick={()=>reset(true)}>My workspace</button></div><details className="workspace-actions"><summary>Actions</summary><div className="workspace-actions-popover">{mode==='example'?<button onClick={e=>{stop();checkpoint();setNodes(example(true));setSelected('vpc');setSource('private');e.currentTarget.closest('details')?.removeAttribute('open')}}>Restore example layout</button>:<button disabled={!nodes.length} onClick={e=>{clearCustom();e.currentTarget.closest('details')?.removeAttribute('open')}}>Clear my workspace</button>}<p>Can be undone with Undo.</p></div></details><label className="toggle-label"><input type="checkbox" checked={traffic} onChange={e=>{setTraffic(e.target.checked);stop()}}/><span className="switch"/> Traffic simulation</label></div>
{engineFailure&&<div className="engine-warning" role="alert"><span>{engineFailure}</span><button onClick={()=>{stop();setEngineFailure('');setEngineEpoch(e=>e+1)}}>Retry engine</button></div>}<p className="workspace-description">{mode==='example'?'A complete reference network to learn from.':'Build your own network here.'} Changes save automatically on this browser.</p><div ref={canvasRef} className={`canvas ${orbiting?'orbiting':''}`} onPointerDownCapture={startTouch} onPointerMoveCapture={moveTouch} onPointerUpCapture={endTouch} onPointerCancelCapture={endTouch} onPointerDown={e=>{if(e.button!==0||(e.target as HTMLElement).closest('.node,.nat-inset,.nacl-boundary,.view-controls,.checks,.empty-scene button'))return;orbit.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,angle,tilt};}} onPointerMove={e=>{const start=orbit.current;if(!start||start.pointer!==e.pointerId)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)<3)return;setOrbiting(true);e.currentTarget.setPointerCapture(e.pointerId);const next=orbitView(start,e.clientX-start.x,e.clientY-start.y);setAngle(next.angle);setTilt(next.tilt)}} onPointerUp={finishOrbit} onPointerCancel={finishOrbit} onLostPointerCapture={finishOrbit} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const type=e.dataTransfer.getData('component');if(types[type])add(type)}}>
<div className="canvas-badge" title="The complete example includes custom ACLs as labelled reference cards and subnet layers. Blank workspaces create no custom ACL automatically."><span className="local-dot"/>{mode==='example'?'EXAMPLE · ALL COMPONENTS':'CUSTOM TOPOLOGY'}</div><div className="scene-wrap"><div ref={sceneRef} className="scene" data-detail={zoom<.7?'compact':'full'} style={{transform:`translate(-50%,-50%) scale(${zoom}) rotateX(${tilt}deg) rotateZ(${angle}deg)`}}>
{nodes.some(n=>n.type==='vpc')?<><button className={`vpc-floor ${selected===nodes.find(n=>n.type==='vpc')?.id?'floor-selected':''}`} onClick={()=>setSelected(nodes.find(n=>n.type==='vpc').id)}><span data-map-label data-priority="1"><Box size={18}/> {name(nodes.find(n=>n.type==='vpc'))} <code>{nodes.find(n=>n.type==='vpc').cidr||'Set a CIDR range'}</code></span></button><div className="zone zone-a"><span data-map-label data-priority="5">AVAILABILITY ZONE A</span></div><div className="zone zone-b"><span data-map-label data-priority="5">AVAILABILITY ZONE B</span></div></>:<div className="empty-scene"><Box size={50}/><h2>Your network starts here</h2><p>Add a VPC from the component palette.</p><button onClick={()=>add('vpc')}>+ Add VPC</button></div>}
<svg className="links" viewBox="0 0 850 720" aria-hidden="true">{connections.map(({a,b},i)=>{
  const start=center(a), end=center(b), middle=(start.y+end.y)/2;
  const previous=steps[current-1]?.id, next=steps[current]?.id;
  const flowing=(previous===a.id&&next===b.id)||(previous===b.id&&next===a.id);
  return <path key={i} d={`M ${start.x} ${start.y} V ${middle} H ${end.x} V ${end.y}`} className={flowing?'flowing':''}/>;
})}</svg>
{positionedNodes.filter(n=>n.type==='subnet').map(sub=>{const acl=nodes.find(n=>n.id===sub.acl&&n.type==='acl');if(!acl)return null;const activeBoundary=steps[current]?.id===acl.id&&steps[current]?.subnetId===sub.id;return <button key={sub.id} className={`nacl-boundary ${selected===acl.id?'boundary-selected':''} ${activeBoundary?(steps[current]?.ok?'boundary-allow':'boundary-deny'):''}`} style={{left:sub.x-15,top:sub.y-15}} aria-label={`${name(acl)} boundary for ${name(sub)}`} title={`${name(acl)} · Click to configure subnet boundary rules`} onClick={()=>setSelected(acl.id)}><span data-map-label data-priority="4"><Shield size={11}/> {name(acl)}</span></button>})}
{positionedNodes.filter(n=>n.type!=='vpc'&&!(mode!=='example'&&n.type==='acl'&&subs.some(sub=>sub.acl===n.id))).map(n=>{const Icon=icons[n.type];const hot=steps[current]?.id===n.id;
if(n.insetSize){
  const label=`${name(n)} · NAT gateway in ${n.hostName||'associated subnet'}`;
  return <button key={n.id} className={`nat-inset ${selected===n.id?'nat-selected':''} ${hot?'nat-active':''}`} style={{left:n.x,top:n.y,width:n.insetSize,height:n.insetSize}} aria-label={label} title={label} onClick={()=>setSelected(n.id)}><Icon size="72%" aria-hidden="true"/></button>;
}
return <button key={n.id} className={`node ${colors[n.type]} ${selected===n.id?'node-selected':''} ${hot?(steps[current]?.ok?'packet-active':'packet-blocked'):''}`} aria-label={`${name(n)} · ${types[n.type]}`} title={`${name(n)} · ${types[n.type]}`} style={{left:n.x,top:n.y}} onClick={()=>setSelected(n.id)} onPointerDown={e=>{if(e.button!==0)return;e.stopPropagation();drag.current={id:n.id,pointer:e.pointerId,x:e.clientX,y:e.clientY,nx:n.x,ny:n.y,saved:false};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const d=drag.current;if(!d||d.id!==n.id||d.pointer!==e.pointerId)return;e.stopPropagation();const sx=e.clientX-d.x,sy=e.clientY-d.y;if(!d.saved&&Math.hypot(sx,sy)<3)return;if(!d.saved){checkpoint();stop();d.saved=true;}const responsiveScale=sceneRef.current?parseFloat(getComputedStyle(sceneRef.current).zoom)||1:1;const delta=planeDelta(sx,sy,angle,tilt,zoom*responsiveScale);setNodes(ns=>ns.map(t=>t.id===n.id?{...t,...subnetPosition(t,d.nx+delta.x,d.ny+delta.y)}:t))}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onLostPointerCapture={()=>drag.current=null}><div className="node-top"><span className="card-depth" aria-hidden="true">{[1,2,3,4,5,6,7,8].map(depth=><i key={depth} style={{transform:`translateZ(-${depth}px)`}}/>)}</span><span className="card-face" aria-hidden="true"/><Icon size={28}/>{hot&&<span className="packet"/>}</div><span data-map-label data-priority={selected===n.id?0:1} className="node-name">{name(n)}</span><span data-map-label data-priority="3" className="node-subtitle" hidden={n.type!=='subnet'&&name(n).toLowerCase()===types[n.type].toLowerCase()}>{n.type==='subnet'?n.cidr||'Configure CIDR':types[n.type]}</span></button>})}
</div></div><div className={`internet ${steps[current]?.id==='internet'?'internet-active':''}`}><Globe size={22}/><span>Internet</span></div><div className="canvas-help"><MousePointer2 size={13}/> Scroll/pinch to zoom workspace <span>·</span> Drag background to rotate</div><div className="view-controls"><button aria-label={`Undo workspace change (${history.length} available)`} title="Undo last workspace change (up to 3)" disabled={!history.length} onClick={undo}><Undo2 size={17}/><span>{history.length}/3</span></button><i/><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.4,z-.1))}><ZoomOut size={17}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(1.8,z+.1))}><ZoomIn size={17}/></button><i/><button aria-label="Rotate view 30 degrees" title="Rotate 30° clockwise" onClick={()=>setAngle(a=>a+30)}><RotateCcw size={17}/></button><button title="Toggle top / 3D view" aria-label="Toggle top view" onClick={()=>setTilt(t=>t?0:35)}><Move3D size={17}/></button><i/><button className="reset-view" aria-label="Reset view" title="Reset rotation, tilt and zoom" onClick={resetView}><Focus size={17}/> Reset view</button></div>
{checks&&<div className="checks"><button aria-label="Close validation" onClick={()=>setChecks(false)}><X size={15}/></button><h3>{engineFailure?'Rust engine unavailable':engineBusy?'Checking configuration…':errors.length?`${errors.length} items to configure`:subs.length?'Existing component checks passed':'VPC CIDR check passed'}</h3>{engineFailure?<p>{engineFailure}</p>:engineBusy?<p>Waiting for the local Rust engine.</p>:errors.length?errors.map((e:string)=><p key={e}>{e}</p>):<p>{subs.length?`Checked ${subs.length} subnet(s) and the routes and ACLs currently present. Connectivity requires a separate traffic test.`:'Only the VPC address range was checked. No subnets, routes or ACL associations exist yet.'}</p>}</div>}
</div>
{traffic&&<section className="traffic-panel"><div className="traffic-title"><span className="icon green"><ArrowRightLeft size={18}/></span><div><h3>Follow a packet</h3><p>Check subnet routing and NACLs with a synthetic TCP probe. EC2 addressing and security groups are not assessed.</p></div><span className="tiny-tag">SIMULATION</span></div><div className="traffic-form"><label>FROM SUBNET<select value={source} onChange={e=>{setSource(e.target.value);stop()}}><option value="">Choose subnet</option>{subs.map(n=><option value={n.id} key={n.id}>{name(n)}</option>)}</select></label><ChevronRight size={16}/><label>DESTINATION IPv4<input value={destination} onChange={e=>{setDestination(e.target.value);stop()}}/></label><label className="port">TCP PORT<input type="number" value={port} onChange={e=>{setPort(e.target.value);stop()}}/></label><button className="run" disabled={runPending} onClick={running?stop:run}>{running?<X size={16}/>:<Play size={16}/>} {runPending?'Checking…':running?'Clear':'Run test'}</button></div>{steps.length>0?<div className="packet-progress" aria-live="polite"><div className="step-controls"><strong>{running?'Running':current===steps.length-1?(steps[current]?.ok?'Completed':'Blocked'):'Paused'} · Step {current+1} of {steps.length}</strong><button onClick={()=>{clearInterval(timer.current);setRunning(false)}} disabled={!running}>Pause</button><button disabled={running||current>=steps.length-1} onClick={()=>{setRunning(true);timer.current=setInterval(()=>setCurrent(i=>{if(i>=steps.length-2){clearInterval(timer.current);setRunning(false);}return Math.min(steps.length-1,i+1)}),1800)}}>Resume</button><button disabled={current>=steps.length-1} onClick={()=>{clearInterval(timer.current);setRunning(false);setCurrent(i=>Math.min(steps.length-1,i+1))}}>Next step</button></div><div className={`active-check ${steps[current]?.ok?'':'failed'}`}><strong>{steps[current]?.title}</strong><p>{steps[current]?.detail}</p></div><details><summary>Previous checks ({current})</summary><ol>{steps.slice(0,current).map((s,i)=><li key={i}>{s.title} — {s.detail}</li>)}</ol></details><p className="help">This is a subnet network check. A direct IGW probe assumes a future workload with a public IPv4; NAT assumes a private workload. No address is assigned and no real traffic is sent.</p></div>:<div className="traffic-hint"><Info size={14}/> No endpoint configuration is needed. This probe checks routing and NACLs only; direct IGW access assumes a future public IPv4. Return traffic uses test port 55000.</div>}</section>}
<footer><span><span className="local-dot"/> {nodes.length} components</span><span>Single-VPC sandbox <span> / </span> Version 0.1</span><a href="https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html" target="_blank" rel="noreferrer">AWS VPC docs <ArrowUpRight size={12}/></a></footer></section>
<aside className="settings"><div className="settings-heading"><SlidersHorizontal size={17}/><h2>Configuration</h2></div><label className="resource-picker">Select component<select aria-label="Select component" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a component</option>{nodes.map(n=><option value={n.id} key={n.id}>{name(n)} · {types[n.type]} · {n.id.slice(0,8)}</option>)}</select></label>{active?<><div className="selected-resource"><span className={`icon large ${colors[active.type]}`}>{(()=>{const Icon=icons[active.type];return <Icon size={25}/>})()}</span><span className="section-eyebrow">{types[active.type]}</span><h2>{name(active)}</h2><p>{hints[active.type]}</p></div><div className="settings-form" onBlurCapture={()=>editSession.current=false}>{['vpc','igw','subnet'].includes(active.type)&&<section className="internet-readiness"><div className="form-heading">SUBNET NETWORK CHECKS</div><p className="help">Route status and routing/NACL checks for 1.1.1.1:443. Workload access is assessed separately when EC2 is added.</p>{accessPending?<p className="help">Checking…</p>:subs.length===0?<p className="help">Add a subnet and associate a route table.</p>:access.length===0?<p className="help">Rust engine unavailable. Start it to check the network.</p>:access.filter(r=>active.type!=='subnet'||r.id===active.id).map(r=><div className={`readiness-row ${r.networkAllowed?(r.requiresPublicIpv4?'conditional':'allowed'):'blocked'}`} key={r.id}><strong>{name(byId.get(r.id))}</strong>
<p>{r.subnetType==='public'?'Public subnet':r.subnetType==='private'?'Private subnet':'Subnet routing unconfigured'} · {byId.get(r.id)?.az?`AZ ${byId.get(r.id).az}`:'AZ unassigned'}<br/>{r.routeTableId?`Route table: ${name(byId.get(r.routeTableId))}`:'No route table associated'}</p><p><strong>Internet route: {r.routeReady?'Configured':'Not configured'}</strong><br/>{r.routeDetail}</p><p><strong>Routing &amp; NACL probe: {r.networkAllowed?(r.requiresPublicIpv4?'Passed with assumed public IPv4':'Passed'):'Blocked / incomplete'}</strong>{!(r.networkAllowed&&r.requiresPublicIpv4)&&<><br/>{r.networkDetail}</>}</p><p><strong>Workload internet access: Not assessed</strong><br/>EC2 and its network-interface addressing are outside this stage.</p>{r.requiresPublicIpv4&&<p className="topology-warning">{r.assumption}</p>}
{r.nat&&<p>NAT: {name(byId.get(r.nat.id))} in {name(byId.get(r.nat.subnetId))}{r.nat.natAz?` · AZ ${r.nat.natAz}`:''}</p>}
{r.nat?.azRelation==='different'&&<p className="topology-warning">Cross-AZ NAT: AZ {r.nat.sourceAz} depends on NAT in AZ {r.nat.natAz}. An outage there can interrupt outbound access, and AWS can charge for cross-AZ traffic.</p>}
{r.nat?.azRelation==='unknown'&&<p>Set both subnet AZs to check for a cross-AZ NAT dependency.</p>}{active.type!=='subnet'&&<button onClick={()=>{stop();setSource(r.id);setSelected(r.id)}}>Open subnet settings</button>}</div>)}</section>}<div className="form-heading">GENERAL</div>{field('Name','name',`Name your ${types[active.type].toLowerCase()}`)}{['vpc','subnet'].includes(active.type)&&field('IPv4 CIDR block','cidr',active.type==='vpc'?'e.g. 10.0.0.0/16':'e.g. 10.0.1.0/24')}{active.type==='vpc'&&<div className="info-card"><Info size={16}/><p>Your VPC is the boundary of this workspace. Add subnets inside its address range, then configure their routing and access rules.</p></div>}{active.type==='subnet'&&<><div className="form-heading">ASSOCIATIONS</div><label>Availability Zone<select value={active.az||''} onChange={e=>update('az',e.target.value)}><option value="">Unassigned</option><option value="A">AZ A</option><option value="B">AZ B</option></select></label>{select('Route table','route','route')}{select('Network ACL','acl','acl')}<p className="help">Workload public IPs belong to EC2 network interfaces and will be configured when EC2 is added. No endpoint setting is required to check this subnet’s routing and NACLs.</p></>}{active.type==='igw'&&<label className="check-label"><input type="checkbox" checked={!!active.attached} onChange={e=>update('attached',e.target.checked)}/> Attached to this VPC</label>}{active.type==='nat'&&<>{select('Public subnet','subnet','subnet')}{select('Elastic IP allocation','eip','eip')}<p className="help">An associated NAT appears inside its host subnet card. That subnet needs a route to the internet gateway, and the NAT needs an Elastic IP.</p></>}{active.type==='eip'&&<p className="help">A simulated public IPv4 allocation. Associate it with a NAT gateway in that gateway’s settings.</p>}
{active.type==='route'&&<><div className="form-heading">ROUTES</div><div className="local-route"><code>{nodes.find(n=>n.type==='vpc')?.cidr||'VPC CIDR'}</code><span>local · automatic</span></div>{(active.routes||[]).map((r:any,i:number)=><div className="rule-card" key={i}><label>Destination CIDR<input value={r.cidr} placeholder="0.0.0.0/0" onChange={e=>update('routes',active.routes.map((x:any,j:number)=>i===j?{...x,cidr:e.target.value}:x))}/></label><label>Target<select value={r.target} onChange={e=>update('routes',active.routes.map((x:any,j:number)=>i===j?{...x,target:e.target.value}:x))}><option value="">Select gateway</option>{nodes.filter(n=>['nat','igw'].includes(n.type)).map(n=><option value={n.id} key={n.id}>{name(n)}</option>)}</select></label><button className="text-button" onClick={()=>update('routes',active.routes.filter((_:any,j:number)=>i!==j))}>Remove route</button></div>)}<button className="add-rule" onClick={()=>update('routes',[...(active.routes||[]),{cidr:'',target:''}])}><Plus size={14}/> Add route</button></>}
{active.type==='acl'&&<><div className="form-heading">SUBNET LAYERS</div><p className="help">Select a subnet to add this custom NACL layer. Each subnet can have one associated NACL.</p>{subs.map(sub=><label className="check-label" key={sub.id}><input type="checkbox" checked={sub.acl===active.id} onChange={e=>{stop();checkpoint();setNodes(ns=>ns.map(n=>n.id===sub.id?{...n,acl:e.target.checked?active.id:''}:n))}}/>{name(sub)}</label>)}<div className="form-heading">TCP RULES</div><p className="help">Lowest matching rule number wins. Inbound and outbound rules are evaluated separately.</p>{(active.rules||[]).map((r:any,i:number)=>{const change=(key:string,value:any)=>update('rules',active.rules.map((x:any,j:number)=>i===j?{...x,[key]:value}:x));return <div className="rule-card" key={i}><div className="rule-row"><label>Rule #<input type="number" value={r.number} onChange={e=>change('number',e.target.value)}/></label><label>Direction<select value={r.direction} onChange={e=>change('direction',e.target.value)}><option value="in">Inbound</option><option value="out">Outbound</option></select></label></div><label>{r.direction==='in'?'Source':'Destination'} CIDR<input value={r.cidr} placeholder="0.0.0.0/0" onChange={e=>change('cidr',e.target.value)}/></label><div className="rule-row"><label>From port<input type="number" value={r.from} onChange={e=>change('from',e.target.value)}/></label><label>To port<input type="number" value={r.to} onChange={e=>change('to',e.target.value)}/></label></div><div className="rule-row"><select aria-label="Rule action" value={r.action} onChange={e=>change('action',e.target.value)}><option value="allow">Allow</option><option value="deny">Deny</option></select><button className="text-button" onClick={()=>update('rules',active.rules.filter((_:any,j:number)=>i!==j))}>Remove</button></div></div>})}<div className="default-rule">* <span>All unmatched traffic</span><strong>Deny</strong></div><button className="add-rule" onClick={()=>update('rules',[...(active.rules||[]),{number:'',direction:'in',cidr:'',from:'',to:'',action:'deny'}])}><Plus size={14}/> Add rule</button></>}
<div className="settings-foot"><Check size={13}/> Changes apply immediately</div><button className="delete" onClick={()=>{stop();checkpoint();setNodes(ns=>removeResource(ns,active));setSelected('');}}><Trash2 size={14}/> Remove {active.type==='vpc'?'VPC and all components':types[active.type].toLowerCase()}</button></div></>:<div className="settings-empty"><MousePointer2 size={30}/><h3>Select a component</h3><p>Click any object in the workspace to configure it here.</p></div>}<div className="scope-note">PREVIEW SCOPE<p>IPv4 · TCP · one VPC · zonal public NAT<br/>No EC2, security groups, DNS, or real AWS calls.</p></div></aside></div>{saveError&&<div className="save-warning" role="alert"><p>{saveError}</p><button onClick={()=>download(JSON.stringify({version:2,mode,drafts:saveDraft(drafts.current,mode,snapshot())},null,2),'vpc-unsaved-workspaces.json')}>Export my edits</button><button onClick={()=>{try{download(localStorage.getItem(STORAGE_KEY)||'null','vpc-original-saved-data.json')}catch{setSaveError('Browser storage is inaccessible. Export your current edits.')}}}>Export original saved data</button><button onClick={()=>loadSaved()}>Load saved version</button><button onClick={()=>{saveBlocked.current=false;setSaveError('');setSaveEpoch(e=>e+1)}}>Retry save</button> <a href="/">Return without saving</a></div>}{notice&&<div className="toast" role="status"><Info size={17}/>{notice}</div>}</main>}
