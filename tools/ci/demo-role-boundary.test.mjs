import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemoFetch} from '../../apps/mobile/lib/demo-backend.ts';
test('guest demo project reads do not claim signed-in roles or project controls',async()=>{
 const fetch=createDemoFetch(async()=>{throw new Error('No external request is allowed')},0);
 const guest=await(await fetch('https://demo.irespond.local/v1/projects/project-water-1')).json();
 assert.equal(guest.permissions,undefined);assert.equal(guest.viewerRoles,undefined);assert.equal(guest.project.id,'project-water-1');
 const signedIn=await(await fetch('https://demo.irespond.local/v1/projects/project-water-1',{headers:{Authorization:'Bearer irespond-offline-demo-token'}})).json();
 assert.deepEqual(signedIn.viewerRoles,['project_manager']);assert.equal(signedIn.permissions.canManageProject,true);
});
