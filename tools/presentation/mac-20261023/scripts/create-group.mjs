import {writeFile,mkdir} from 'node:fs/promises';
import {root,db,users,state,save,ensure,client,wait,assert,randomUUID} from './lib.mjs';
import {packagePath,fraction,arithmetic,readme} from './group-source.mjs';
assert(process.argv.includes('--execute'),'Explicit --execute required');
const knownProject=new Set([state['group-project-draft']?.id,state['group-project']?.id]);
assert((await db.projectTask.findMany({select:{id:true}})).every(p=>knownProject.has(p.id)),'Unrecorded Project: reconcile before rerunning');
const knownRepository=new Set([state['group-repo']?.id,state['group-repo']?.repository?.id,state.groupId]);
assert((await db.repository.findMany({where:{projectTaskId:{not:null}},select:{id:true}})).every(r=>knownRepository.has(r.id)),'Unrecorded Group repository: reconcile before rerunning');
const instructor=await client('instructor'),leader=await client('leader'),member=await client('member');
const cls=state['class-cp2'];assert.equal(cls.officialClassCode,'CS202');
const draft=await ensure('group-project-draft',()=>instructor.post(`/classes/${cls.id}/project-tasks`,{title:'Prelim Group Project 1',instructions:'Fraction Arithmetic\n\nRequired project name: CS202AlvarezBennettPrelimGroupProject (class code CS202 + surnames Alvarez, Bennett in alphabetical order + exact suffix PrelimGroupProject).\n\nRequired Java package: edu.slu.prog2.pregroup01. Implement Fraction with numerator and denominator, object construction, reduction and arithmetic. FractionArithmetic must contain main and an interactive menu to enter two fractions, add, subtract, multiply, divide, reduce/display and quit. Display fraction and decimal results. Reject zero denominators and division by zero. Use fictional identifiers only.\n\nRepository files: README.md and src/edu/slu/prog2/pregroup01/Fraction.java and FractionArithmetic.java. The team Maintainer reviews Developer changes and authorizes a fast-forward merge; protected main must not be bypassed. The Group browser editor provides Git collaboration, not Activity automated grading.',dueDate:'2026-10-30T15:59:00.000Z',maxTeamSize:2},201));
const project=await ensure('group-project',()=>instructor.post(`/project-tasks/${draft.id}/publish`,{expectedUpdatedAt:draft.updatedAt}));
const repo=await ensure('group-repo',()=>leader.post(`/project-tasks/${project.id}/repositories`,{teamName:'Alvarez–Bennett',repositoryName:'CS202AlvarezBennettPrelimGroupProject',description:'Prelim Group Project 1 — Fraction Arithmetic'},201));
const id=repo.id??repo.repository?.id;assert.ok(id);
await wait(()=>leader.get(`/repositories/${id}`),r=>r.storageStatus==='READY','group storage');
const invite=await ensure('group-invite',()=>leader.post(`/repositories/${id}/invitations`,{inviteeUserId:users.member.id},201));
await ensure('group-joined',()=>member.post(`/repository-invitations/${invite.invitationId}/accept`,{}));
async function commit(key,actor,branch,file,content,message,head){
 const job=await ensure(key+'-job',()=>actor.post(`/repositories/${id}/browser-commits`,{branchName:branch,filePath:file,operation:'CREATE',content,commitMessage:message,expectedHeadCommitHash:head},202,randomUUID()));
 return ensure(key,()=>wait(()=>actor.get(`/repositories/${id}/browser-commits/${job.jobId}`),r=>r.status==='SUCCEEDED',key));
}
const initial=await commit('group-initial',leader,'main','README.md',readme,'Document Fraction Arithmetic assignment and collaboration plan',null);
const model=await commit('group-model',leader,'main',packagePath+'Fraction.java',fraction,'Implement reduced Fraction model and arithmetic operations',initial.commitHash);
const branch=await ensure('group-branch',()=>leader.post(`/repositories/${id}/browser-refs`,{operation:'CREATE_BRANCH',sourceBranchName:'main',targetBranchName:'feature/arithmetic-menu',expectedSourceCommitHash:model.commitHash,expectedTargetCommitHash:null},202,randomUUID()));
await wait(()=>leader.get(`/repositories/${id}/browser-refs/${branch.jobId}`),r=>r.status==='SUCCEEDED','branch creation');
const menu=await commit('group-menu',member,'feature/arithmetic-menu',packagePath+'FractionArithmetic.java',arithmetic,'Implement interactive FractionArithmetic menu and decimal display',model.commitHash);
// Source has been reviewed locally against the required menu, package, arithmetic and error handling.
const merge=await ensure('group-merge-job',()=>leader.post(`/repositories/${id}/browser-refs`,{operation:'FAST_FORWARD',sourceBranchName:'feature/arithmetic-menu',targetBranchName:'main',expectedSourceCommitHash:menu.commitHash,expectedTargetCommitHash:model.commitHash},202,randomUUID()));
await wait(()=>leader.get(`/repositories/${id}/browser-refs/${merge.jobId}`),r=>r.status==='SUCCEEDED','Maintainer fast-forward');
state.groupHead=menu.commitHash;state.groupId=id;await save();
const dir=new URL('solutions/group/'+packagePath,root);await mkdir(dir,{recursive:true});await writeFile(new URL('Fraction.java',dir),fraction);await writeFile(new URL('FractionArithmetic.java',dir),arithmetic);
assert.equal(await db.projectTask.count(),1);console.log('Created real two-person Group, three authored commits and authorized fast-forward merge: '+menu.commitHash);
await db.$disconnect();
