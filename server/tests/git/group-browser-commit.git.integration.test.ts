import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
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
  const record = await tx.repository.create({ data: { projectTaskId:project.id,teamId:team.id,ownerId:lead.id,repositoryType:'CLASS_PROJECT',repositoryName:'Browser QA repository',slug:`browser-${randomUUID()}`,visibility:'CLASS_ONLY',status:'ACTIVE',reviewStatus:'WORKING',storageStatus:'PENDING', members:{create:[{studentId:lead.id,memberRole:'OWNER',status:'ACTIVE'},{studentId:developer.id,memberRole:'MEMBER',status:'ACTIVE'}]},provisioningJob:{create:{maxClaimAttempts:3}} } })
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
beforeEach(async()=>cleanIntegrationDatabase(prisma))
afterAll(async()=>{await cleanIntegrationDatabase(prisma);await prisma.$disconnect()})
describe('real Group browser commits',()=>{
  it('initializes, exposes a real file/history, clones it natively and allows a Developer feature edit',async()=>{
    const f=await fixture(), first=await commit(f)
    expect(first.status).toBe('SUCCEEDED'); expect(first.commitHash).toMatch(/^[0-9a-f]{40}$/)
    expect(await content.file(f.lead,f.repository.id,{commitId:first.commitHash!,path:'README.md'})).toMatchObject({content:initial.content})
    const clone=path.join(process.env.GIT_STORAGE_ROOT!,'native-'+randomUUID());await git.run(['clone',f.root,clone])
    expect(await readFile(path.join(clone,'README.md'),'utf8')).toBe(initial.content)
    await git.run(['checkout','-b','feature/browser'],clone);await git.run(['push','origin','feature/browser'],clone)
    const input={...initial,branchName:'feature/browser',operation:'UPDATE' as const,content:'# Updated by Developer\n',commitMessage:'Improve README',expectedHeadCommitHash:first.commitHash}
    const queued=await service.create(f.developer,f.repository.id,input,randomUUID());await worker.processNext(randomUUID())
    const second=await service.get(f.developer,f.repository.id,queued.jobId);expect(second.status).toBe('SUCCEEDED')
    await git.run(['fetch','origin'],clone)
    expect((await git.run(['show','origin/feature/browser:README.md'],clone)).stdout).toBe(input.content)
    expect((await git.run(['show','-s','--format=%ae',second.commitHash!],clone)).stdout.trim()).toBe(`student-${f.developer.id}@projex.local`)
    expect((await content.history(f.lead,f.repository.id,{branchName:'feature/browser',page:1,limit:20})).commits).toHaveLength(2)
    expect(await prisma.activitySubmission.count()).toBe(0);expect(await prisma.repositoryCheckpointJob.count()).toBe(0)
  })
  it.each(['developer','outsider','instructor','admin'] as const)('denies protected main or unauthorized actor %s',async role=>{
    const f=await fixture();await expect(service.create(f[role],f.repository.id,initial,randomUUID())).rejects.toMatchObject({code:role==='developer'?'BROWSER_WRITE_DENIED':'REPOSITORY_NOT_FOUND'})
    expect(await prisma.groupBrowserCommitJob.count()).toBe(0)
  })
  it('denies Viewer writes using the same authority as native Git',async()=>{
    const f=await fixture();await prisma.repositoryMember.updateMany({where:{repositoryId:f.repository.id,studentId:f.developer.id},data:{memberRole:'VIEWER'}})
    await expect(service.create(f.developer,f.repository.id,{...initial,branchName:'feature/edit',expectedHeadCommitHash:'a'.repeat(40)},randomUUID())).rejects.toMatchObject({code:'BROWSER_WRITE_DENIED'})
  })
  it.each(['CLOSED','REVIEW','DEADLINE','REMOVED','SUSPENDED'] as const)('rechecks %s at durable execution',async condition=>{
    const f=await fixture(), queued=await service.create(f.lead,f.repository.id,initial,randomUUID())
    if(condition==='CLOSED')await prisma.projectTask.update({where:{id:f.project.id},data:{status:'CLOSED',closedAt:new Date()}})
    if(condition==='REVIEW')await prisma.repository.update({where:{id:f.repository.id},data:{reviewStatus:'READY_FOR_REVIEW',readyForReviewAt:new Date()}})
    if(condition==='DEADLINE')await prisma.projectTask.update({where:{id:f.project.id},data:{dueDate:new Date(Date.now()-1000)}})
    if(condition==='REMOVED')await prisma.classMember.updateMany({where:{classId:f.classRecord.id,studentId:f.lead.id},data:{status:'REMOVED'}})
    if(condition==='SUSPENDED')await prisma.user.update({where:{id:f.lead.id},data:{status:'SUSPENDED'}})
    await worker.processNext(randomUUID())
    expect(await prisma.groupBrowserCommitJob.findUnique({where:{id:queued.jobId}})).toMatchObject({status:'FAILED',failureCode:'BROWSER_ACCESS_REVOKED'})
    expect((await git.run(['--git-dir','.','for-each-ref','--format=%(refname)','refs/heads/'],f.root)).stdout.trim()).toBe('')
  })
  it('preserves a native push when it races the browser CAS',async()=>{
    const f=await fixture(), first=await commit(f), clone=path.join(process.env.GIT_STORAGE_ROOT!,'native-'+randomUUID())
    await git.run(['clone',f.root,clone]);await writeFile(path.join(clone,'README.md'),'Native update\n')
    await git.run(['add','README.md'],clone);await git.run(['-c','user.name=Native QA','-c','user.email=native@example.test','commit','-m','Native update'],clone)
    const queued=await service.create(f.lead,f.repository.id,{...initial,operation:'UPDATE',content:'Browser update\n',expectedHeadCommitHash:first.commitHash},randomUUID())
    const racingWriter={...writer,publish:async(...args:Parameters<typeof writer.publish>)=>{await git.run(['push','origin','main'],clone);return writer.publish(...args)}}
    await createGroupBrowserCommitWorker({prisma,writer:racingWriter,logger}).processNext(randomUUID())
    expect(await service.get(f.lead,f.repository.id,queued.jobId)).toMatchObject({status:'CONFLICTED',failureCode:'BROWSER_HEAD_CHANGED'})
    expect((await git.run(['--git-dir','.','show','main:README.md'],f.root)).stdout).toBe('Native update\n')
  })
  it('recovers a published commit after worker interruption without making another commit',async()=>{
    const f=await fixture(), key=randomUUID(), queued=await service.create(f.lead,f.repository.id,initial,key)
    const crashingWriter={...writer,publish:async(...args:Parameters<typeof writer.publish>)=>{await writer.publish(...args);throw new Error('QA interrupted after atomic refs')}}
    await createGroupBrowserCommitWorker({prisma,writer:crashingWriter,logger}).processNext(randomUUID())
    expect(await service.get(f.lead,f.repository.id,queued.jobId)).toMatchObject({status:'PENDING',commitHash:null})
    await prisma.groupBrowserCommitJob.update({where:{id:queued.jobId},data:{availableAt:new Date(0)}})
    await prisma.repository.update({where:{id:f.repository.id},data:{reviewStatus:'READY_FOR_REVIEW',readyForReviewAt:new Date()}})
    // Read-authorized idempotent retries recover the existing request after write authority changes.
    expect(await service.create(f.lead,f.repository.id,initial,key)).toMatchObject({jobId:queued.jobId})
    await worker.processNext(randomUUID())
    expect(await service.get(f.lead,f.repository.id,queued.jobId)).toMatchObject({status:'SUCCEEDED'})
    expect((await git.run(['--git-dir','.','rev-list','--count','main'],f.root)).stdout.trim()).toBe('1')
    expect(await prisma.repositoryActivity.count({where:{repositoryId:f.repository.id,activityType:'COMMIT'}})).toBe(1)
  })
  it('rejects unsafe existing Git objects and conflicting file creation without changing HEAD',async()=>{
    const f=await fixture(), first=await commit(f)
    const unsafeBlob=(await git.run(['--git-dir','.','hash-object','-w','--stdin'],f.root,{stdin:'target.txt'})).stdout.trim()
    const binaryBlob=(await git.run(['--git-dir','.','hash-object','-w','--stdin'],f.root,{stdin:'binary\0data'})).stdout.trim()
    const tree=(await git.run(['--git-dir','.','mktree'],f.root,{stdin:`120000 blob ${unsafeBlob}\tLink.java\n100644 blob ${binaryBlob}\tBinary.java\n100644 blob ${unsafeBlob}\tReadme.md\n`})).stdout.trim()
    const head=(await git.run(['--git-dir','.','commit-tree',tree,'-p',first.commitHash!],f.root,{stdin:'Native objects\n',actorId:f.lead.id,commitDate:new Date().toISOString()})).stdout.trim()
    await git.run(['--git-dir','.','update-ref','refs/heads/main',head,first.commitHash!],f.root)
    for(const [filePath,operation,failureCode] of [
      ['Link.java','UPDATE','BROWSER_PATH_UNSAFE'],
      ['Link.java/file.md','CREATE','BROWSER_PATH_UNSAFE'],
      ['Binary.java','UPDATE','BROWSER_FILE_UNSUPPORTED'],
      ['README.md','CREATE','BROWSER_PATH_UNSAFE'],
      ['Readme.md','CREATE','BROWSER_FILE_CHANGED'],
      ['Missing.java','UPDATE','BROWSER_FILE_CHANGED'],
    ] as const){
      const result=await commit(f,{filePath,operation,expectedHeadCommitHash:head})
      expect(result).toMatchObject({status:'FAILED',failureCode})
      expect((await git.run(['--git-dir','.','rev-parse','main'],f.root)).stdout.trim()).toBe(head)
    }
  })
  it('scopes idempotency to the payload and bounds active requests',async()=>{
    const f=await fixture(), key=randomUUID(), first=await service.create(f.lead,f.repository.id,initial,key)
    expect(await service.create(f.lead,f.repository.id,initial,key)).toMatchObject({jobId:first.jobId})
    await expect(service.create(f.lead,f.repository.id,{...initial,content:'Different'},key)).rejects.toMatchObject({code:'BROWSER_IDEMPOTENCY_CONFLICT'})
    await expect(service.create(f.lead,f.repository.id,initial,randomUUID())).rejects.toMatchObject({code:'BROWSER_COMMIT_IN_PROGRESS'})
  })
})
