import { describe, expect, it } from 'vitest'
import { containerArguments, pinnedJavaImage, verifyJavaContainerHost } from './java-container.js'
const input = { name: 'origin-java-123-00000000-0000-4000-8000-000000000001', directory: '/var/lib/origin/java/job-one', uid: 1001, gid: 1001, image: 'sha256:' + 'a'.repeat(64), compiler: false, args: ['-cp', '/var/lib/origin/java/job-one/classes', 'Main'], timeoutMs: 3000 }
describe('isolated Java container command boundary', () => {
 it('pins the image and enforces bounded, nonroot, offline, read-only execution without secrets or broad mounts', () => {
  const args = containerArguments(input)
  for (const flag of ['--network=none','--log-driver=none','--cgroupns=private','--ipc=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--security-opt=apparmor=docker-default','--pids-limit=64','--memory=256m','--memory-swap=256m','--cpus=1']) expect(args).toContain(flag)
  expect(args).toContain('type=bind,src=/var/lib/origin/java/job-one,dst=/work,readonly')
  expect(args).toContain('/work/classes'); expect(args).toContain('1001:1001'); expect(args).toContain('5s')
  expect(args.join(' ')).not.toMatch(/privileged|docker.sock|DATABASE_URL|ACCESS_TOKEN_SECRET|--network=host/)
 })
 it('allows compiler output only in its job directory and disables annotation processing', () => {
  const args = containerArguments({ ...input, compiler: true, args: ['-d', input.directory + '/classes', 'Main.java'] })
  expect(args).toContain('type=bind,src=/var/lib/origin/java/job-one,dst=/work')
  expect(args).toContain('-proc:none'); expect(args).toContain('-J-Xmx128m')
 })
 it('refuses mutable image tags, root and mount-argument injection', () => {
  expect(pinnedJavaImage('eclipse-temurin:17')).toBe(false)
  expect(() => containerArguments({ ...input, image: 'latest' })).toThrow()
  expect(() => containerArguments({ ...input, uid: 0 })).toThrow()
  expect(() => containerArguments({ ...input, directory: '/tmp/job,src=/' })).toThrow()
 })
 it('fails closed before calling Docker for an invalid immutable-image configuration', async () => {
  await expect(verifyJavaContainerHost({ executable: '/usr/bin/docker', image: 'latest' })).rejects.toThrow('JAVA_CONTAINER_CONFIGURATION_INVALID')
 })
})
