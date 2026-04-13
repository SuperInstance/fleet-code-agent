import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises'; import * as path from 'path'; import * as os from 'os';
import { createIdentity, loadIdentity, saveIdentity } from './identity.js';
import { initWorkshop, recordSession } from './workshop.js';
let td: string;
beforeEach(async()=>{td=await fs.mkdtemp(path.join(os.tmpdir(),'t-'));});
afterEach(async()=>{await fs.rm(td,{recursive:true,force:true});});
describe('CodeAgent',()=>{
  it('creates identity',()=>{const i=createIdentity({id:'x',name:'X',keeperUrl:'u',model:'m'});expect(i.id).toBe('x');});
  it('saves and loads',async()=>{const i=createIdentity({id:'x',name:'X',keeperUrl:'u',model:'m'});
    await saveIdentity(td,i);const l=await loadIdentity(td);expect(l!.id).toBe('x');});
  it('inits workshop',async()=>{await initWorkshop(td);const s=await fs.stat(path.join(td,'workshop/recipes'));expect(s).toBeDefined();});
  it('records sessions',async()=>{await initWorkshop(td);await recordSession(td,{action:'TEST'});
    const l=await fs.readFile(path.join(td,'.agent/session-log.md'),'utf-8');expect(l).toContain('TEST');});
});
