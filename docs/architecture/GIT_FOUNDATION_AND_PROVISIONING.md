# Git Foundation and Repository Provisioning

## Status and scope

Phase 8A adds the controlled-local Git foundation and durable bare-repository provisioning. Phase 8B builds authenticated loopback-only Smart HTTP on this foundation as documented in `GIT_SMART_HTTP_TRANSPORT.md`. Phase 8C adds the read-only browsing, history, tree, bounded text-file, and diff boundary documented in `GIT_REPOSITORY_INSPECTION.md`; merge, server-created history, contribution attribution, and frontend behavior remain deferred.

The tested Windows toolchain is Git for Windows `2.55.0.windows.3`. The worker accepts supported Git for Windows versions at or above `2.55.0`, records the detected version, and always invokes the validated absolute `GIT_EXECUTABLE`. PATH ordering is never authoritative.

## Safety boundary

- `GIT_EXECUTION_MODE=disabled` is the default and creates no directory.
- `local_process` is permitted only in controlled development and test environments; production validation rejects it.
- Git runs in the separate `git-worker` process, never in the API process or a database migration.
- Core Git behavior uses no GitHub or GitLab API.
- The runner uses fixed typed operations, argument arrays, `shell: false`, bounded output, a timeout, hidden windows, non-interactive configuration, and a sanitized Git environment.
- Absolute paths, Git arguments, storage keys, and Git output are omitted from logs and API responses.

## Storage layout

`GIT_STORAGE_ROOT` is an absolute server-controlled root. Repository names, slugs, and client input never participate in path construction.

```text
<root>/
  repositories/<first-two-uuid-chars>/<next-two>/<repository-uuid>.git
  staging/<repository-uuid>-<job-uuid>/
  quarantine/<repository-uuid>-<job-uuid>[-<unique-suffix>]/
```

Every managed staging/final repository has a versioned, non-secret ownership marker. Path handling checks canonical containment, Windows case-insensitive comparisons, reserved device names, trailing dots/spaces, alternate data streams, traversal, symbolic links, junctions, reparse escapes, and unsupported filesystem entries.

`Repository.storagePath` is a portable, server-owned READY-state integrity locator, not authoritative host placement. New values always use forward slashes in the exact UUID-derived form `repositories/<first-two>/<next-two>/<repository-uuid>.git`, including on Windows. Runtime filesystem placement is independently derived from the configured root and validated repository UUID. Exact legacy Windows backslash locators remain readable for existing repositories, but mixed separators, absolute paths, traversal, alternate buckets, mismatched UUIDs, and all other path forms are rejected. Existing rows and repository directories do not require normalization or movement.

`quarantineKey` remains internal recovery evidence and is never used to resolve a READY repository. Quarantined state is retained for separately approved recovery; this portability correction neither rewrites nor deletes quarantine records or directories.

Local development may configure an ignored `.git-storage` location, but hosted deployment requires a separately approved persistent volume and hardening review. Physical repository deletion is not part of Phase 8A.

## Database lifecycle

`Repository.storageStatus` uses:

- `PENDING`: durable work exists and has not been claimed.
- `PROVISIONING`: a leased worker is processing it.
- `READY`: the final bare repository passed all verification.
- `FAILED`: bounded retry attempts were exhausted.
- `QUARANTINED`: unsafe or mismatched filesystem state was preserved away from normal processing.

A `RepositoryProvisioningJob` is unique per repository. It records attempts, availability, claim/lease state, safe failure code, optional quarantine key, and completion timestamps. New repository rows and their jobs are created in the same serializable PostgreSQL transaction.

The migration backfills existing repositories as `PENDING` and creates jobs idempotently. It never creates directories, invokes Git, or starts a worker.

## Provisioning transaction boundary

Filesystem/Git work cannot share a PostgreSQL transaction, so recovery uses an ownership marker and an atomic same-volume rename:

1. Claim the PostgreSQL job with `FOR UPDATE SKIP LOCKED` and a lease.
2. Derive UUID-only staging and final paths plus the canonical portable database locator.
3. Create the owned staging directory.
4. Run `git init --bare --initial-branch=main`.
5. Verify the repository is bare, `HEAD` is `refs/heads/main`, no refs exist, and `git fsck` succeeds.
6. Atomically rename staging to the final UUID-derived path.
7. Revalidate marker, Git state, and bounded storage size at the final path.
8. In one database transaction, mark the repository `READY`, complete the job, and insert exactly one `REPOSITORY_PROVISIONED` system activity.

If the process stops after the rename but before database completion, the next lease holder validates the matching final marker and completes idempotently. Mismatched or unexpected state is never overwritten or deleted; it is quarantined and processing stops.

## Phase 9C bounded failed-job retry

An ACTIVE administrator may requeue only the existing exhausted FAILED provisioning job when both job and repository storage state are safe, the repository remains provisionable, no path/worker/lease/quarantine state exists, and the supplied `expectedUpdatedAt` is current. The same transaction preserves `claimAttempt` and failure diagnostics, adds exactly one to `maxClaimAttempts` (never beyond 10), returns the job to `PENDING`, moves storage to `PENDING`, and writes one allowlisted audit event.

This admin API does not resolve a storage path, inspect or create a directory, execute Git, or start the worker. Only a later separate-worker claim clears the retained failure fields and performs provisioning. Quarantined storage requires a separately approved recovery design and is never requeued through Phase 9C.

## Empty repository rule

A successfully provisioned repository is an empty bare Git repository whose symbolic `HEAD` is `refs/heads/main`. It has no commits, branch refs, tags, README, starter content, or synthetic activity. The first branch and commit are created only by an authenticated Phase 8B push; provisioning itself continues to create no history.

## Test isolation

Real-Git tests require both `TEST_DATABASE_URL` naming exactly `projex_test` and an explicit absolute `TEST_GIT_STORAGE_ROOT` whose final directory name is `projex_git_test`.

The test root must not overlap the project workspace or normal Git root. Each run creates a UUID child and sentinel; cleanup deletes only that verified current-run child. Test configuration never falls back to `DATABASE_URL` or `GIT_STORAGE_ROOT`. Tests use committed migrations through `prisma migrate deploy`; reset, db push, schema drop, and database drop are forbidden.

## Deployment boundary

Phase 8A supports controlled local development and demonstration only. Internet-hosted Git remains disabled until separately approved Linux/container isolation, TLS, restricted service identity, permissions, backup/restore, monitoring, supported-version policy, and operational recovery are implemented and verified.
