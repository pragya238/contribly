"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccountState } from '@/lib/account-state';

const serialize=(value:unknown)=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);

export function useAccountWorkspace(data: AccountState, apply: (data: AccountState | null) => void) {
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState('Loading account…');
  const [error,setError]=useState('');
  const [conflict,setConflict]=useState(false);
  const revision=useRef(0), saving=useRef(false), lastSaved=useRef(''), queued=useRef<string|null>(null);
  const latest=useRef(data);latest.current=data;
  const applyRef=useRef(apply);applyRef.current=apply;
  const alive=useRef(true);
  const blocked=useRef(false);
  const loadId=useRef(0);
  const load=useCallback(async()=>{
    const id=++loadId.current;setError('');setStatus('Loading account…');setReady(false);
    try {
      const response=await fetch('/api/workspace',{cache:'no-store'});const body:any=await response.json();
      if(!response.ok)throw new Error(body.error||'Unable to load your account.');
      if(!alive.current||id!==loadId.current)return;
      revision.current=body.revision;lastSaved.current=body.data?serialize(body.data):'';
      applyRef.current(body.data);setReady(true);setStatus('Saved to your account');
    }catch(e){if(alive.current&&id===loadId.current){setError((e as Error).message);setStatus('Account unavailable');}}
  },[]);
  useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[load]);
  const flush=useCallback(async()=>{
    if(saving.current||blocked.current)return;
    saving.current=true;
    try {
      while(queued.current!==null){
        const snapshot=queued.current;queued.current=null;
        if(snapshot===lastSaved.current)continue;
        setStatus('Saving…');
        const response=await fetch('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:revision.current,data:JSON.parse(snapshot)}),keepalive:snapshot.length<55000});
        const result:any=await response.json();
        if(!response.ok){if(response.status===409)setConflict(true);throw new Error(result.error||'Your changes could not be saved.');}
        revision.current=result.revision;lastSaved.current=snapshot;
      }
      if(alive.current){setStatus(serialize(latest.current)===lastSaved.current?'Saved to your account':'Unsaved changes');setError('');}
    }catch(e){blocked.current=true;if(alive.current){setError((e as Error).message);setStatus('Changes not saved');}}
    finally{saving.current=false;}
  },[]);
  const serialized=serialize(data);
  useEffect(()=>{
    if(!ready||serialized===lastSaved.current)return;
    setStatus('Unsaved changes');
    const timer=setTimeout(()=>{queued.current=serialized;void flush();},650);
    return()=>clearTimeout(timer);
  },[serialized,ready,flush]);
  useEffect(()=>{
    const warn=(e:BeforeUnloadEvent)=>{if(ready&&serialize(latest.current)!==lastSaved.current){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[ready]);
  const retry=()=>{if(!ready){void load();return;}if(conflict)return;blocked.current=false;queued.current=serialize(latest.current);void flush();};
  return {ready,status,error,conflict,retry};
}
