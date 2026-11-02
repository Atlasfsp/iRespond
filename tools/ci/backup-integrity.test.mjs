import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

async function runFixture(t,extra={}){
 const dir=await mkdtemp(join(tmpdir(),'irespond-recovery-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));const log=join(dir,'calls');
 await writeFile(join(dir,'docker'),`#!/usr/bin/env python3
import sys,os
command=sys.argv[-1]
with open(os.environ['FAKE_DOCKER_LOG'],'a') as f:f.write(command+'\\n')
if 'FROM pg_database' in command:print(os.environ.get('FAKE_EXISTING','0'))
elif 'SELECT table_name' in command:print('needs')
elif 'COPY (SELECT to_jsonb' in command:
 if os.environ.get('FAKE_FAIL_COPY'):sys.exit(1)
 restored="-d 'irespond_restore_verify" in command
 print(('b' if restored and os.environ.get('FAKE_CORRUPT') else 'a')*64)
elif 'count(*)' in command:print('1')
elif 'SELECT version' in command:print('0001_core.sql')
`,{mode:0o755});
 const result=spawnSync('bash',[resolve(process.env.SCRIPT_UNDER_TEST||'tools/verify_yugabyte_backup_restore.sh')],{encoding:'utf8',timeout:15000,env:{...process.env,PATH:`${dir}:${process.env.PATH}`,FAKE_DOCKER_LOG:log,YUGABYTE_CONTAINER:'synthetic-test',YUGABYTE_SOURCE_DB:'yugabyte',YUGABYTE_RESTORE_DB:'irespond_restore_verify_test',...extra}});
 const calls=await readFile(log,'utf8').catch(()=> '');return{...result,calls};
}
test('recovery refuses the source database before contacting Docker',async t=>{
 const r=await runFixture(t,{YUGABYTE_SOURCE_DB:'irespond_restore_verify_same',YUGABYTE_RESTORE_DB:'irespond_restore_verify_same'});assert.notEqual(r.status,0);assert.equal(r.calls,'');
});
test('recovery refuses to overwrite an existing scratch database',async t=>{
 const r=await runFixture(t,{FAKE_EXISTING:'1'});assert.notEqual(r.status,0);assert.doesNotMatch(r.calls,/DROP DATABASE|CREATE DATABASE/);
});
test('equal counts cannot conceal corrupted restored rows',async t=>{
 const r=await runFixture(t,{FAKE_CORRUPT:'1'});assert.notEqual(r.status,0);assert.match(r.stderr,/row-content mismatch/);
});
test('failed content reads cannot be certified as recovery',async t=>{
 const r=await runFixture(t,{FAKE_FAIL_COPY:'1'});assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/recovery verified/);
});
test('matching schema and content succeed with scratch cleanup',async t=>{
 const r=await runFixture(t);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/rowContent=equal/);assert.match(r.calls,/DROP DATABASE irespond_restore_verify_test/);
});
