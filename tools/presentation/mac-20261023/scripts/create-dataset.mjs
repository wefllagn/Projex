import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {root,db,users,state,save,ensure,client,wait,assert,randomUUID} from './lib.mjs';
import {activities,classDescriptions} from './catalog.mjs';
assert(process.argv.includes('--execute'),'Explicit --execute required');
const knownUsers=new Set([users.admin.id,...Object.entries(state).filter(([k])=>k.startsWith('account-')).map(([,v])=>v.id)]);
assert((await db.user.findMany({select:{id:true}})).every(u=>knownUsers.has(u.id)),'Unrecorded account: reconcile it before rerunning; no creation attempted');
const knownClasses=new Set(Object.entries(state).filter(([k])=>k.startsWith('class-')).map(([,v])=>v.id));
assert((await db.class.findMany({select:{id:true}})).every(c=>knownClasses.has(c.id)),'Unrecorded Class: reconcile it before rerunning');
const knownActivities=new Set(Object.entries(state).filter(([k])=>k.startsWith('draft-')||k.startsWith('activity-')).map(([,v])=>v.id));
assert((await db.programmingActivity.findMany({select:{id:true}})).every(a=>knownActivities.has(a.id)),'Unrecorded Activity: reconcile it before rerunning');
const admin=await client('admin');
for(const key of ['instructor','student','leader','member']){
 const account=await ensure('account-'+key,()=>admin.post('/users/'+(key==='instructor'?'instructors':'students'),{fullName:users[key].fullName,universityEmail:users[key].email},201));
 users[key].id=account.id;
 await writeFile(new URL('private/accounts.json',root),JSON.stringify(users,null,2)+'\n',{mode:0o600});
 await ensure('setup-'+key,async()=>{
  const token=new URL(account.manualSetup.setupLink).hash.slice(7);
  const publicClient=await client(key,false);
  await publicClient.post('/account-setup/complete',{setupToken:decodeURIComponent(token),password:users[key].password,confirmPassword:users[key].password},[200,204]);return true;
 });
}
const instructor=await client('instructor'),student=await client('student'),leader=await client('leader'),member=await client('member');
for(const [key,num,name] of [['cp1','CS101','Computer Programming 1'],['cp2','CS202','Computer Programming 2']]){
 const course=await ensure('course-'+key,()=>admin.post('/courses',{courseNumber:num,courseName:name},201));
 const cls=await ensure('class-'+key,()=>admin.post('/classes',{program:'INFORMATION_TECHNOLOGY',className:name,courseId:course.id,officialClassCode:num,academicPeriod:'FIRST_SEMESTER',schoolYear:'2026-2027',instructorId:users.instructor.id,schedule:key==='cp1'?'9:00 AM–10:30 AM':'1:00 PM–2:30 PM',days:key==='cp1'?'Monday / Thursday':'Tuesday / Friday',room:'Programming Laboratory'},201));
 assert.equal(cls.status,'ACTIVE');assert.equal(cls.officialClassCode,num);
 const join=await instructor.get(`/classes/${cls.id}/join-code`);
 for(const [actor,key2] of [[student,'student'],[leader,'leader'],[member,'member']])await ensure('enroll-'+key+'-'+key2,async()=>{await actor.post('/classes/join',{classCode:join.classCode},[200,201]);return true;});
}
const dueDate='2026-10-30T15:59:00.000Z';
for(const a of activities){
 const cls=state['class-'+a.classKey];
 let activity=await ensure('draft-'+a.key,()=>instructor.post(`/classes/${cls.id}/activities`,{title:a.title,instructions:a.subtitle+'\n\n'+classDescriptions[a.classKey]+'\n\n'+a.instructions,dueDate,entryClassName:'Main',starterCode:a.starterCode,maxAttempts:3,totalPoints:100},201));
 const tests=await ensure('cases-'+a.key,()=>instructor.put(`/activities/${activity.id}/test-cases`,{expectedUpdatedAt:activity.updatedAt,testCases:a.cases}));
 activity=await ensure('activity-'+a.key,()=>instructor.post(`/activities/${activity.id}/publish`,{expectedUpdatedAt:tests.activityUpdatedAt}));
 const dir=new URL('solutions/'+a.key+'/',root);await mkdir(dir,{recursive:true,mode:0o700});await writeFile(new URL('Main.java',dir),a.source,{mode:0o600});
 await ensure('visible-check-'+a.key,async()=>{
  const run=await student.post(`/activities/${activity.id}/visible-test-runs`,{sourceCode:a.source},202);
  const result=await wait(()=>student.get(`/visible-test-runs/${run.id}`),r=>['succeeded','failed'].includes(r.status),'visible '+a.key);
  assert.equal(result.status,'succeeded');assert(result.visibleTestOutcomes.every(t=>t.outcome==='passed'));return {runId:run.id,passed:result.visibleTestOutcomes.length};
 });
 if(['circle','record','fraction'].includes(a.key)){
  const accepted=await ensure('submission-'+a.key,()=>student.post(`/activities/${activity.id}/submissions`,{sourceCode:a.source},201,randomUUID()));
  const assessed=await wait(()=>instructor.get(`/submissions/${accepted.id}`),r=>['assessed','released'].includes(r.status),'assessment '+a.key);
  assert.equal(assessed.scores.originalAutomatedScore,80);
  if(a.key!=='record'){
   const feedback=a.key==='circle'?'Clear assignment statements and appropriate int/double declarations. Circle formulas, two-decimal formatting, PascalCase and camelCase verified.':'Fraction attributes, constructor, addition and Euclidean reduction verified in source. Correct object construction and reduced numerator/denominator output.';
   await ensure('review-'+a.key,async()=>{const fresh=await instructor.get(`/submissions/${accepted.id}`);return instructor.put(`/submissions/${accepted.id}/review`,{expectedUpdatedAt:fresh.updatedAt,instructorPoints:20,feedbackText:feedback});});
   await ensure('release-'+a.key,async()=>{const fresh=await instructor.get(`/submissions/${accepted.id}`);return instructor.post(`/submissions/${accepted.id}/release`,{expectedUpdatedAt:fresh.updatedAt});});
   const released=await student.get(`/submissions/${accepted.id}`);assert.equal(released.finalScore,100);assert.equal(released.status,'released');
  }
 }
 console.log('Verified published Activity and real Java results: '+a.title);
}
assert.equal(await db.class.count(),2);assert.equal(await db.programmingActivity.count(),5);assert.equal(await db.user.count(),5);
await save();await db.$disconnect();console.log('Five Activities created through authenticated workflows; primary live Activities retain zero submissions.');
