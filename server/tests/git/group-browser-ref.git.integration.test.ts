import { createGitGroupBrowserRefWriter } from '../../src/infrastructure/git/git-group-browser-ref-writer.js'
import { createGroupBrowserRefService } from '../../src/modules/group-browser-refs/group-browser-ref.service.js'
import { createGroupBrowserRefWorker } from '../../src/modules/group-browser-refs/group-browser-ref-worker.js'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import pino from 'pino'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createGitCommandRunner } from '../../src/infrastructure/git/git-command-runner.js'
import { createGitGroupBrowserWriter } from '../../src/infrastructure/git/git-group-browser-writer.js'
import { createRepositoryStorage } from '../../src/infrastructure/storage/repository-storage.js'
import { createPostgresRepositoryProvisioningQueue } from '../../src/infrastructure/job-queue/repository-provisioning-queue.js'
import { createRepositoryProvisioningService } from '../../src/modules/repositories/repository-provisioning.service.js'
import { createPrismaGitTransportRepository } from '../../src/modules/git-transport/git-transport.repository.js'
import { createGroupBrowserCommitService } from '../../src/modules/group-browser-commits/group-browser-commit.service.js'
import { createGroupBrowserCommitWorker } from '../../src/modules/group-browser-commits/group-browser-commit-worker.js'
import { createGitRepositoryReader } from '../../src/infrastructure/git/git-repository-reader.js'
import { createRepositoryContentService } from '../../src/modules/repository-content/repository-content.service.js'
import { cleanIntegrationDatabase, createActiveClass, createActiveMembership, createActiveUser, createIntegrationPrisma } from '../integration/database.js'

const prisma = createIntegrationPrisma(), logger = pino({ level: 'silent' })
const git = createGitCommandRunner({ executable: process.env.GIT_EXECUTABLE!, timeoutMs: 30000, outputLimitBytes: 4194304 })
const storage = createRepositoryStorage({ root: process.env.GIT_STORAGE_ROOT!, repositorySizeLimitBytes: 104857600 })
const writer = createGitGroupBrowserWriter({ git, resolveRepository: (id,locator) => storage.resolveManagedRepository(id,locator), checkSize: async root => { await storage.measure(root) } })
const worker = createGroupBrowserCommitWorker({ prisma,writer,logger })
const service = createGroupBrowserCommitService({ prisma, accessRepository: createPrismaGitTransportRepository(prisma), enabled: true })
const content = createRepositoryContentService({ enabled: true, accessRepository: createPrismaGitTransportRepository(prisma), storage, logger, reader: createGitRepositoryReader({ executable: process.env.GIT_EXECUTABLE!, timeoutMs:30000, commandOutputLimitBytes:4194304, fileLimitBytes:262144, diffLimitBytes:524288, maxChangedFiles:500, maxBranches:100, maxConcurrent:4 }) })
async function fixture() {
  const instructor = await createActiveUser(prisma,'INSTRUCTOR'), lead = await createActiveUser(prisma,'STUDENT'), developer = await createActiveUser(prisma,'STUDENT'), outsider = await createActiveUser(prisma,'STUDENT'), admin = await createActiveUser(prisma,'ADMIN')
  const classRecord = await createActiveClass(prisma,instructor.id)
  for (const student of [lead,developer,outsider]) await createActiveMembership(prisma,classRecord.id,student.id)
  const project = await prisma.projectTask.create({ data: { classId:classRecord.id,createdById:instructor.id,title:'Browser QA task',instructions:'Edit bounded files.',dueDate:new Date(Date.now()+86400000),maxTeamSize:4,status:'PUBLISHED',publishedAt:new Date() } })
  const {team,record}=await prisma.$transaction(async tx=>{
  const team = await tx.team.create({ data: { projectTaskId:project.id,leadStudentId:lead.id,name:'Browser QA team',normalizedName:'browser qa team' } })
  for (const student of [lead,developer]) await tx.teamMember.create({ data: { teamId:team.id,projectTaskId:project.id,studentId:student.id,memberRole:student.id===lead.id?'LEAD':'MEMBER',status:'ACTIVE' } })
  const record = await tx.repository.create({ data: { projectTaskId:project.id,teamId:team.id,ownerId:lead.id,repositoryType:'CLASS_PROJECT',repositoryName:'Browser QA repository',slug:`browser-${randomUUID()}`,visibility:'CLASS_ONLY',status:'ACTIVE',reviewStatus:'WORKING',storageStatus:'PENDING', members:{create:[{studentId:lead.id,memberRole:'OWNER',status:'ACTIVE'},{studentId:developer.id,memberRole:'MEMBER',status:'ACTIVE'}]},provisioningJob:{create:{maxClaimAttempts:3,availableAt:new Date(0)}} } })
    return {team,record}
  })
  const queue = createPostgresRepositoryProvisioningQueue(prisma)
  const job = await queue.claimNext({ workerId:randomUUID(),now:new Date(),leaseMs:60000 })
  if (!job) throw new Error('QA provisioning missing')
  await createRepositoryProvisioningService({queue,git,storage,logger}).process(job)
  const repository = await prisma.repository.findUniqueOrThrow({ where:{id:record.id} })
  const root = await storage.resolveManagedRepository(repository.id,repository.storagePath!)
  return { repository,root,lead,developer,instructor,outsider,admin,project,classRecord,team }
}
const initial = { branchName:'main',filePath:'README.md',operation:'CREATE' as const,content:'# Real Group repository\n',commitMessage:'Initialize README',expectedHeadCommitHash:null }
async function commit(f:Awaited<ReturnType<typeof fixture>>, overrides = {}) {
  const queued = await service.create(f.lead,f.repository.id,{...initial,...overrides},randomUUID())
  await worker.processNext(randomUUID())
  return service.get(f.lead,f.repository.id,queued.jobId)
}

const reader=createGitRepositoryReader({ executable:process.env.GIT_EXECUTABLE!,timeoutMs:30000,commandOutputLimitBytes:4194304,fileLimitBytes:262144,diffLimitBytes:524288,maxChangedFiles:500,maxBranches:100,maxConcurrent:4 })
const refWriter=createGitGroupBrowserRefWriter({git,maxBranches:100,resolveRepository:(id,locator)=>storage.resolveManagedRepository(id,locator)})
const refWorker=createGroupBrowserRefWorker({prisma,writer:refWriter,logger})
const refs=createGroupBrowserRefService({prisma,enabled:true,accessRepository:createPrismaGitTransportRepository(prisma),reader,storage})
type Fixture=Awaited<ReturnType<typeof fixture>>
async function revision(f:Fixture,name:string){return (await git.run(['--git-dir','.','rev-parse','refs/heads/'+name],f.root)).stdout.trim()}
async function createBranch(f:Fixture,actor:Fixture['lead'],name:string,source='main') {
  const queued=await refs.create(actor,f.repository.id,{operation:'CREATE_BRANCH',sourceBranchName:source,targetBranchName:name,expectedSourceCommitHash:await revision(f,source),expectedTargetCommitHash:null},randomUUID())
  await refWorker.processNext(randomUUID())
  return refs.get(actor,f.repository.id,queued.jobId)
}
async function mergeInput(f:Fixture,source:string,target='main'){
  return {operation:'FAST_FORWARD' as const,sourceBranchName:source,targetBranchName:target,expectedSourceCommitHash:await revision(f,source),expectedTargetCommitHash:await revision(f,target)}
}
async function advance(f:Fixture,name:string){
  const before=await revision(f,name),tree=(await git.run(['--git-dir','.','rev-parse',before+'^{tree}'],f.root)).stdout.trim()
  const next=(await git.run(['--git-dir','.','commit-tree',tree,'-p',before],f.root,{stdin:'Concurrent native change '+name+' '+randomUUID()+'\n',actorId:f.lead.id,commitDate:new Date().toISOString()})).stdout.trim()
  await git.run(['--git-dir','.','update-ref','refs/heads/'+name,next,before],f.root)
  return next
}
beforeEach(async()=>cleanIntegrationDatabase(prisma))
afterAll(async()=>{await cleanIntegrationDatabase(prisma);await prisma.$disconnect()})
describe('real Group branch creation and fast-forward merges',()=>{
  it('creates Maintainer/Developer branches, commits, previews, fast-forwards main and retrieves exact refs natively',async()=>{
    const f=await fixture(),first=await commit(f)
    expect(await createBranch(f,f.lead,'feature/lead')).toMatchObject({status:'SUCCEEDED',commitHash:first.commitHash})
    expect(await createBranch(f,f.developer,'feature/student')).toMatchObject({status:'SUCCEEDED',commitHash:first.commitHash})
    expect((await content.branches(f.lead,f.repository.id)).map(branch=>branch.branchName)).toContain('feature/student')
    const queued=await service.create(f.developer,f.repository.id,{...initial,branchName:'feature/student',operation:'UPDATE',content:'A real Developer change\n',commitMessage:'Improve greeting',expectedHeadCommitHash:first.commitHash},randomUUID())
    await worker.processNext(randomUUID())
    const saved=await service.get(f.developer,f.repository.id,queued.jobId)
    expect(saved.status).toBe('SUCCEEDED')
    const preview=await refs.preview(f.lead,f.repository.id,'feature/student','main')
    expect(preview).toMatchObject({fastForward:true,upToDate:false,commitCount:1,sourceCommitHash:saved.commitHash,targetCommitHash:first.commitHash,files:['README.md']})
    expect(preview.commits[0]?.subject).toBe('Improve greeting')
    const merge=await refs.create(f.lead,f.repository.id,await mergeInput(f,'feature/student'),randomUUID());await refWorker.processNext(randomUUID())
    expect(await refs.get(f.lead,f.repository.id,merge.jobId)).toMatchObject({status:'SUCCEEDED',commitHash:saved.commitHash})
    const clone=path.join(process.env.GIT_STORAGE_ROOT!,'refs-native-'+randomUUID());await git.run(['clone',f.root,clone]);await git.run(['fetch','origin'],clone)
    for(const branch of ['main','feature/student','feature/lead'])expect((await git.run(['rev-parse','origin/'+branch],clone)).stdout.trim()).toBe(await revision(f,branch))
    expect(await readFile(path.join(clone,'README.md'),'utf8')).toBe('A real Developer change\n')
    expect((await git.run(['--git-dir','.','rev-list','--count','main'],f.root)).stdout.trim()).toBe('2')
    expect(await prisma.repositoryActivity.count({where:{repositoryId:f.repository.id,activityType:'MERGE'}})).toBe(1)
    expect(await prisma.activitySubmission.count()).toBe(0);expect(await prisma.repositoryCheckpointJob.count()).toBe(0)
  })
  it('rejects invalid refs and protected-main creation before creating a job',async()=>{
    const f=await fixture();await commit(f)
    for(const name of ['main','MAIN','HEAD','refs/heads/unsafe','a..b','a/.x','a/','a.lock','-flag','a b']){
      await expect(refs.create(f.lead,f.repository.id,{operation:'CREATE_BRANCH',sourceBranchName:'main',targetBranchName:name,expectedSourceCommitHash:await revision(f,'main'),expectedTargetCommitHash:null},randomUUID())).rejects.toThrow()
    }
    expect(await prisma.groupBrowserRefJob.count()).toBe(0)
  })
  it('uses atomic create-if-absent for simultaneous requests and rejects duplicate/case-prefix names',async()=>{
    const f=await fixture();await commit(f)
    const input={operation:'CREATE_BRANCH' as const,sourceBranchName:'main',targetBranchName:'feature/shared',expectedSourceCommitHash:await revision(f,'main'),expectedTargetCommitHash:null}
    const jobs=await Promise.all([refs.create(f.lead,f.repository.id,input,randomUUID()),refs.create(f.developer,f.repository.id,input,randomUUID())])
    await Promise.all([refWorker.processNext(randomUUID()),refWorker.processNext(randomUUID())])
    const results=await prisma.groupBrowserRefJob.findMany({where:{id:{in:jobs.map(job=>job.jobId)}}})
    expect(results.map(job=>job.status).sort()).toEqual(['CONFLICTED','SUCCEEDED'])
    expect(await createBranch(f,f.lead,'Feature/Shared')).toMatchObject({status:'CONFLICTED',failureCode:'BROWSER_BRANCH_EXISTS'})
    expect(await createBranch(f,f.lead,'feature')).toMatchObject({status:'CONFLICTED',failureCode:'BROWSER_BRANCH_EXISTS'})
  })
  it('allows a Developer fast-forward into a feature branch while denying protected main',async()=>{
    const f=await fixture();await commit(f);await createBranch(f,f.developer,'feature/source');await createBranch(f,f.developer,'feature/target');await advance(f,'feature/source')
    await expect(refs.create(f.developer,f.repository.id,await mergeInput(f,'feature/source'),randomUUID())).rejects.toMatchObject({code:'BROWSER_WRITE_DENIED'})
    await expect(refs.preview(f.developer,f.repository.id,'feature/source','main')).rejects.toMatchObject({code:'BROWSER_WRITE_DENIED'})
    const queued=await refs.create(f.developer,f.repository.id,await mergeInput(f,'feature/source','feature/target'),randomUUID());await refWorker.processNext(randomUUID())
    expect(await refs.get(f.developer,f.repository.id,queued.jobId)).toMatchObject({status:'SUCCEEDED',commitHash:await revision(f,'feature/source')})
  })
  it.each(['outsider','instructor','admin'] as const)('denies unrelated or non-Student actor %s',async role=>{
    const f=await fixture();await commit(f)
    await expect(refs.create(f[role],f.repository.id,{operation:'CREATE_BRANCH',sourceBranchName:'main',targetBranchName:'feature/denied',expectedSourceCommitHash:await revision(f,'main'),expectedTargetCommitHash:null},randomUUID())).rejects.toMatchObject({code:'REPOSITORY_NOT_FOUND'})
    expect(await prisma.groupBrowserRefJob.count()).toBe(0)
  })
  it('denies a Viewer and scopes status reads to the requesting actor',async()=>{
    const f=await fixture();await commit(f);await prisma.repositoryMember.updateMany({where:{repositoryId:f.repository.id,studentId:f.developer.id},data:{memberRole:'VIEWER'}})
    const input={operation:'CREATE_BRANCH' as const,sourceBranchName:'main',targetBranchName:'feature/only-lead',expectedSourceCommitHash:await revision(f,'main'),expectedTargetCommitHash:null}
    await expect(refs.create(f.developer,f.repository.id,input,randomUUID())).rejects.toMatchObject({code:'BROWSER_WRITE_DENIED'})
    const queued=await refs.create(f.lead,f.repository.id,input,randomUUID())
    await expect(refs.get(f.developer,f.repository.id,queued.jobId)).rejects.toMatchObject({code:'BROWSER_ACTION_NOT_FOUND'})
  })
  it('refuses diverged and already-equal branches without changing either ref',async()=>{
    const f=await fixture();await commit(f);await createBranch(f,f.lead,'feature/diverged')
    const equal=await refs.create(f.lead,f.repository.id,await mergeInput(f,'feature/diverged'),randomUUID());await refWorker.processNext(randomUUID())
    expect(await refs.get(f.lead,f.repository.id,equal.jobId)).toMatchObject({status:'CONFLICTED',failureCode:'BROWSER_ALREADY_UP_TO_DATE'})
    const source=await advance(f,'feature/diverged'),target=await advance(f,'main')
    expect(await refs.preview(f.lead,f.repository.id,'feature/diverged','main')).toMatchObject({fastForward:false})
    const queued=await refs.create(f.lead,f.repository.id,await mergeInput(f,'feature/diverged'),randomUUID());await refWorker.processNext(randomUUID())
    expect(await refs.get(f.lead,f.repository.id,queued.jobId)).toMatchObject({status:'CONFLICTED',failureCode:'BROWSER_BRANCH_DIVERGED'})
    expect(await revision(f,'main')).toBe(target);expect(await revision(f,'feature/diverged')).toBe(source)
  })
  it.each(['source','target'] as const)('atomically rejects a concurrent %s revision change at publication',async side=>{
    const f=await fixture();await commit(f);await createBranch(f,f.lead,'feature/race');await advance(f,'feature/race')
    const input=await mergeInput(f,'feature/race'),queued=await refs.create(f.lead,f.repository.id,input,randomUUID())
    let advanced=''
    const racing={...refWriter,publish:async(...args:Parameters<typeof refWriter.publish>)=>{advanced=await advance(f,side==='source'?'feature/race':'main');return refWriter.publish(...args)}}
    await createGroupBrowserRefWorker({prisma,writer:racing,logger}).processNext(randomUUID())
    expect(await refs.get(f.lead,f.repository.id,queued.jobId)).toMatchObject({status:'CONFLICTED',failureCode:'BROWSER_REF_CHANGED'})
    expect(await revision(f,'main')).toBe(side==='target'?advanced:input.expectedTargetCommitHash)
    expect(await revision(f,'feature/race')).toBe(side==='source'?advanced:input.expectedSourceCommitHash)
    expect(await refWriter.receipt({...input,id:queued.jobId,actorId:f.lead.id,repositoryId:f.repository.id,storagePath:f.repository.storagePath!})).toBeNull()
  })
  it.each(['CLOSED','REVIEW','DEADLINE','CLASS','TEAM','REPOSITORY_MEMBER','CLASS_MEMBER','SUSPENDED'] as const)('rechecks %s before durable branch mutation',async condition=>{
    const f=await fixture();await commit(f)
    const queued=await refs.create(f.developer,f.repository.id,{operation:'CREATE_BRANCH',sourceBranchName:'main',targetBranchName:'feature/blocked',expectedSourceCommitHash:await revision(f,'main'),expectedTargetCommitHash:null},randomUUID())
    if(condition==='CLOSED')await prisma.projectTask.update({where:{id:f.project.id},data:{status:'CLOSED',closedAt:new Date()}})
    if(condition==='REVIEW')await prisma.repository.update({where:{id:f.repository.id},data:{reviewStatus:'READY_FOR_REVIEW',readyForReviewAt:new Date()}})
    if(condition==='DEADLINE')await prisma.projectTask.update({where:{id:f.project.id},data:{dueDate:new Date(Date.now()-1000)}})
    if(condition==='CLASS')await prisma.class.update({where:{id:f.classRecord.id},data:{status:'ARCHIVED'}})
    if(condition==='TEAM')await prisma.$transaction(async tx=>{await tx.teamMember.updateMany({where:{teamId:f.team.id,studentId:f.developer.id},data:{status:'REMOVED',removedAt:new Date()}});await tx.repositoryMember.updateMany({where:{repositoryId:f.repository.id,studentId:f.developer.id},data:{status:'REMOVED',removedAt:new Date()}})})
    if(condition==='REPOSITORY_MEMBER')await prisma.$transaction(async tx=>{await tx.teamMember.updateMany({where:{teamId:f.team.id,studentId:f.developer.id},data:{status:'REMOVED',removedAt:new Date()}});await tx.repositoryMember.updateMany({where:{repositoryId:f.repository.id,studentId:f.developer.id},data:{status:'REMOVED',removedAt:new Date()}})})
    if(condition==='CLASS_MEMBER')await prisma.classMember.updateMany({where:{classId:f.classRecord.id,studentId:f.developer.id},data:{status:'REMOVED',removedAt:new Date()}})
    if(condition==='SUSPENDED')await prisma.user.update({where:{id:f.developer.id},data:{status:'SUSPENDED'}})
    await refWorker.processNext(randomUUID())
    expect(await prisma.groupBrowserRefJob.findUnique({where:{id:queued.jobId}})).toMatchObject({status:'FAILED',failureCode:'BROWSER_ACCESS_REVOKED'})
    expect((await git.run(['--git-dir','.','for-each-ref','--format=%(refname)','refs/heads/feature/blocked'],f.root)).stdout.trim()).toBe('')
  })
  it('rechecks authorization after preparation immediately before publication',async()=>{
    const f=await fixture();await commit(f)
    const queued=await refs.create(f.developer,f.repository.id,{operation:'CREATE_BRANCH',sourceBranchName:'main',targetBranchName:'feature/late-revoke',expectedSourceCommitHash:await revision(f,'main'),expectedTargetCommitHash:null},randomUUID())
    const revoking={...refWriter,prepare:async(...args:Parameters<typeof refWriter.prepare>)=>{const value=await refWriter.prepare(...args);await prisma.$transaction(async tx=>{await tx.teamMember.updateMany({where:{teamId:f.team.id,studentId:f.developer.id},data:{status:'REMOVED',removedAt:new Date()}});await tx.repositoryMember.updateMany({where:{repositoryId:f.repository.id,studentId:f.developer.id},data:{status:'REMOVED',removedAt:new Date()}})});return value}}
    await createGroupBrowserRefWorker({prisma,writer:revoking,logger}).processNext(randomUUID())
    expect(await prisma.groupBrowserRefJob.findUnique({where:{id:queued.jobId}})).toMatchObject({status:'FAILED',failureCode:'BROWSER_ACCESS_REVOKED'})
  })
  it('recovers an interrupted published merge exactly once even after target advances or freezes',async()=>{
    const f=await fixture();await commit(f);await createBranch(f,f.lead,'feature/recovery');await advance(f,'feature/recovery')
    const input=await mergeInput(f,'feature/recovery'),key=randomUUID(),queued=await refs.create(f.lead,f.repository.id,input,key)
    const interrupted={...refWriter,publish:async(...args:Parameters<typeof refWriter.publish>)=>{await refWriter.publish(...args);throw Error('QA interruption after atomic publication')}}
    await createGroupBrowserRefWorker({prisma,writer:interrupted,logger}).processNext(randomUUID())
    expect(await refs.get(f.lead,f.repository.id,queued.jobId)).toMatchObject({status:'PENDING'})
    const later=await advance(f,'main')
    await prisma.repository.update({where:{id:f.repository.id},data:{reviewStatus:'READY_FOR_REVIEW',readyForReviewAt:new Date()}})
    expect(await refs.create(f.lead,f.repository.id,input,key)).toMatchObject({jobId:queued.jobId})
    await prisma.groupBrowserRefJob.update({where:{id:queued.jobId},data:{availableAt:new Date(0)}});await refWorker.processNext(randomUUID())
    expect(await refs.get(f.lead,f.repository.id,queued.jobId)).toMatchObject({status:'SUCCEEDED',commitHash:input.expectedSourceCommitHash})
    expect(await revision(f,'main')).toBe(later)
    expect(await prisma.repositoryActivity.count({where:{repositoryId:f.repository.id,activityType:'MERGE'}})).toBe(1)
  })
  it('bounds active requests across commits/ref jobs and binds idempotent retries to exact input',async()=>{
    const f=await fixture(),first=await commit(f),input={operation:'CREATE_BRANCH' as const,sourceBranchName:'main',targetBranchName:'feature/idempotency',expectedSourceCommitHash:first.commitHash!,expectedTargetCommitHash:null},key=randomUUID()
    const queued=await refs.create(f.lead,f.repository.id,input,key)
    expect(await refs.create(f.lead,f.repository.id,input,key)).toMatchObject({jobId:queued.jobId})
    await expect(refs.create(f.lead,f.repository.id,{...input,targetBranchName:'feature/other'},key)).rejects.toMatchObject({code:'BROWSER_IDEMPOTENCY_CONFLICT'})
    await expect(service.create(f.lead,f.repository.id,{...initial,operation:'UPDATE',expectedHeadCommitHash:first.commitHash},randomUUID())).rejects.toMatchObject({code:'BROWSER_COMMIT_IN_PROGRESS'})
    await refWorker.processNext(randomUUID())
    await service.create(f.lead,f.repository.id,{...initial,operation:'UPDATE',expectedHeadCommitHash:first.commitHash},randomUUID())
    await expect(refs.create(f.lead,f.repository.id,input,randomUUID())).rejects.toMatchObject({code:'BROWSER_ACTION_IN_PROGRESS'})
  })
})
