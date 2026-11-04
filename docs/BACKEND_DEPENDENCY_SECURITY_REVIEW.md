# Backend dependency security review

Reviewed 2026-11-05 against main `4bc3a687cf0a868fd329785f4d6c2ef2eefa0f19` on `fix/backend-dependency-security`. Pin the containing security commit from the PR, not a moving branch. This report authorizes neither deployment nor migration.

## Scope and decision

The reproduced backend **production** audit had eight affected packages: one critical, six high and one moderate. The patched installed graph reports **zero production findings**. The unchanged frontend production audit also reports zero. The full backend audit, including development tools, has 14 remaining package findings (five high, nine moderate), detailed below. Package counts include inherited findings, not eight independent root vulnerabilities.

Only the backend manifest/lockfile, eight focused regression tests and this report change. Application implementation, authorization, worker isolation, Nginx configuration, frontend, Prisma schema and all 31 migrations remain unchanged. No audit suppression, forced audit fix or Prisma major upgrade is used.

| Dependency | Before | Locked version | Exposure and disposition |
| --- | --- | --- | --- |
| proxy-addr | 2.0.7 | 2.0.8 | Critical mapped-IPv6 subnet trust bypass; patched through Express's compatible range. Origin uses numeric one-hop trust rather than the affected subnet rules; both trust styles have regressions. [Advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). |
| body-parser | 2.3.0 | 2.4.0 | High compressed-body trailing-data process crash. `app.ts` installs JSON parsing before authentication, making this an applicable unauthenticated input boundary. Actual delayed compressed requests and subsequent health requests are tested. [Advisory](https://github.com/advisories/GHSA-27r3-jxmh-p828). |
| qs | 6.15.3 | 6.17.1 | Parser/stringifier denial-of-service and limits issues. Origin uses Express's default simple query parsing, no URL-encoded body parser and no direct qs calls; patch retained for Express and tooling consumers. [Parser advisory](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g), [stringifier advisory](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw). |
| nodemailer | 9.0.3 | 10.1.4 | Multiple address/SMTP parsing, recipient and transport findings. This is the smallest identified release clearing every current applicable advisory range; a 9.x bump would leave findings. Node >=20 is compatible with the Node 24 build. Origin's unchanged SMTP adapter uses one configured transport, bounded address strings and no caller-selected attachments/URLs. Real local SMTP AUTH and delivery are tested. [High parser advisory](https://github.com/advisories/GHSA-v53p-9fqp-m79j), [10.1.4 recipient fix](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8). |
| zod | 4.4.3 | 4.6.7 | High oversized-collection validation exhaustion; validators are widely used at API/config boundaries. Bounded collection validation is tested to stop before visiting 10,000 elements. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). |
| deepmerge-ts, through @prisma/config | 7.1.5 | 8.0.0 | High recursive-object stack exhaustion; exact override scoped to `@prisma/config@6.19.3`. [Advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). |
| prisma / @prisma/client / @prisma/config | 6.19.3 | 6.19.3 | Prisma/config findings were inherited from deepmerge-ts, now patched. No Prisma upgrade or schema change. |

Body-parser's content-type subdependency moves compatibly from 2.0.0 to 2.1.0. All other changes are limited to the rows above. The lockfile's registry integrity hashes remain present; use `npm ci`, not an unlocked install.

## Prisma tooling and override compatibility

Prisma 6.19.3 was the newest stable 6.x available during this review. The audit's suggested Prisma 7 update would be an unnecessary major ORM/config migration. Instead the manifest pins only `@prisma/config@6.19.3 -> deepmerge-ts@8.0.0`; no global deepmerge override is used.

The API, Git worker and Java worker import generated `@prisma/client`, not Prisma CLI/config. A fresh-process test confirms constructing/disconnecting the generated client does not load Prisma CLI, config or deepmerge-ts. The production audit still includes CLI/config through the client's optional Prisma peer, and `build-release.sh` ships all installed node_modules. Therefore these were treated as shipped tooling, not dismissed as dev-only.

The vulnerable merge requires recursive JavaScript object graphs; JSON HTTP input cannot directly express such cycles, and Prisma loads trusted operator/source configuration rather than user repository code. The override also removes the vulnerable implementation. Deepmerge 8 changes Map merging, some type names and `deepmergeInto` mutation semantics; Prisma 6 uses `deepmerge` on plain config records. Tests exercise that actual resolved dependency, cyclic records, nested plain records, `loadConfigFromFile`, and `prisma validate --config`. Generate, real migrations, database integration and migration-history comparison cover the normal project path. See the [upstream breaking-change notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0).

Residual compatibility risk: this override is outside Prisma 6's declared deepmerge major range. Keep it exact and scoped, use trusted config files, and reconsider/remove it when Prisma supplies a compatible upstream patch. Arbitrary future Map/custom-function configs are not validated by this review.

## Verification

All database suites use a new security-only PostgreSQL cluster on a separate loopback port. Windows and Ubuntu database/Git suites run serially; Git storage has per-run ownership sentinels. No demo database, existing repository root, manual acceptance environment or deployed service is used.

| Check | Windows | Ubuntu 24.04 / WSL2 |
| --- | --- | --- |
| Backend unit/security | 522 passed; one existing POSIX-only executable-bit case skipped | 523 passed |
| API/database integration | 163 passed | 163 passed |
| Native Git/browser checkpoints/refs/provisioning | 50 passed | 50 passed |
| Smart HTTP/practice/verified HTTPS Git | 29 passed | 29 passed |
| Real Java compiler/runtime and assessment fixtures | 47 passed | 47 passed |
| Backend build, application/integration types, lint | Passed | Passed |

Frontend: 747 tests and production build passed; existing large-chunk warning remains. Pilot operator guard tests: 11 passed. The eight new backend tests also cover CORS, numeric trusted-proxy behavior, SMTP authentication/delivery and the absence of CLI tooling from generated-client execution.

Existing regressions cover student/instructor sessions, CSRF, account recovery, official source immutability and grading/release; exhausted-attempt Practice Again eligibility, explicit feedback release, replacement/revocation/archive/deadline permissions; browser/native concurrency; credential generation/revocation, repository scoping, read-only and cross-user denial; clone/push/pull/fetch/branches, disabled transport, malformed paths and safe hook rejection. Java checks invoke real javac/java in disposable jobs. Production container/systemd confinement is checked by contracts and guard tests, not claimed as a live host test.

A populated synthetic upgrade from the frozen release's 30 migrations to the unchanged 31-migration schema passed. Counts and fingerprints of all 40 existing tables stayed identical, both practice tables stayed empty and missing historical feedback was not invented. This is compatibility evidence, not a live database drift check or a new backup attestation.

`prisma migrate status` reports all 31 applied, and the compiled release preflight passes configuration, database, migration checksum, enabled Git and enabled Java checks on disposable Windows and Ubuntu resources. Ubuntu's fresh installed graph also reports zero production audit findings. A read-only database-to-database comparison confirms the populated upgrade has exactly the same structure as a separate fresh 31-migration installation.

**Existing schema-model discrepancy:** a database-to-Prisma-datamodel diff exits 2 on both unchanged main and this candidate, producing identical output. It includes SQL-managed defaults, custom constraint/index names and constraints/indexes that the datamodel does not express. This is not caused by the dependency patch. No drift repair, schema edit or generated migration was attempted. Treat committed migrations as the schema authority; never use `db push` to reconcile these differences. Actual deployment drift must be checked against migration history/expected database structure, with the existing model discrepancy reviewed separately. A passing checksum preflight is not proof of datamodel equality.

A further focused acceptance passed through real Ubuntu Nginx 1.24.0 using the unchanged pilot routing template, with only fixture domain, loopback ports, certificate and private temporary paths substituted. Verified certificate trust, clone, commit, push, fetch, second-clone pull, upstream branch push, Origin source synchronization, anonymous/read-only denial and plaintext Git rejection. This used the real Git HTTP worker listener factory; it does not attest systemd confinement or the Azure proxy. The 28 excluded cases in this focused run had already passed in the unmodified full 29-case suite. No Nginx package/service was installed and no system configuration was changed. Azure itself was not accessed.

## Remaining full-audit findings

These are explicitly `dev: true` in the backend lockfile and absent from the production audit. They are not imported by production API/Git/Java source. They remain present in the current all-node_modules release artifact, so an attacker with local code execution or a newly exposed tool server must not be treated as harmless. Do not expose Vite/Vitest servers or run tooling on untrusted source/configuration. Build only this reviewed source in a controlled environment.

| Packages / installed versions | Audit count | Actual scope / remaining risk |
| --- | --- | --- |
| Vite 8.1.5 | 1 high | Vitest transform/development server tooling; editor integration, development filesystem and middleware findings. Not the production static frontend or API server. [Example advisory](https://github.com/advisories/GHSA-698v-4r3x-3vcv). |
| brace-expansion 1.1.17 and 5.0.8 | 1 high package, two installed instances | Lint/glob tooling; crafted brace patterns can exhaust resources. [Advisory](https://github.com/advisories/GHSA-rgw5-rvv9-x895). |
| js-yaml 4.3.0 | 1 high | ESLint/config tooling; malicious YAML can exhaust CPU. No runtime YAML parser API. [Advisory](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj). |
| nanoid 3.3.16 | 1 high | PostCSS/Vite tooling; affected custom zero-size generator, not Origin's runtime IDs. [Advisory](https://github.com/advisories/GHSA-2v37-7h3g-55p8). |
| source-map-js 1.2.1 | 1 high | PostCSS/Vite tooling; crafted indexed maps can exhaust the event loop. [Advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). |
| Vitest 4.1.10 and @vitest/mocker 4.1.10 | 2 moderate | Test/dev-server mock routes; not started by production systemd units. [File-read advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [mock-registration advisory](https://github.com/advisories/GHSA-qxg6-89mg-rqv8). |
| minimatch 10.2.6 | 1 moderate | TypeScript-ESLint glob processing; crafted patterns can exhaust resources. Fixed version requires a major transitive change. [Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249). |
| typescript-eslint 8.65.0 and its eslint-plugin/parser/type-utils/typescript-estree/utils packages | 6 moderate inherited findings | Inherited from minimatch; no production request path. Audit proposes an older tooling line rather than a compatible patch. |

A separate bounded development-tool update is recommended. This patch avoids an untested major parser/tooling override and does not misrepresent a clean production audit as a clean full audit. Advisory state is time-dependent; repeat both audits at artifact build/review time.

## Build, deployment and rollback gates

**Ready for independent security PR review and a new immutable build, not automatic Azure activation.** The old staged 4bc3a687 artifact still contains the vulnerable lockfile and must not be activated as the patched release. After review, build the approved exact security/merge SHA with `deploy/pilot/build-release.sh SOURCE FULL_SHA` as the ordinary Ubuntu build user; retain the new artifact/checksums and separately approve activation. Do not edit a staged artifact or install packages into the active release.

This patch adds zero migrations. On the user-reported 30-migration pilot, the expected pending set remains only `20261104000000_activity_practice`; independently confirm names, checksums and drift before a separately approved migration. Use the existing paired database/Git/private-config backup and restoration gate. No reset, seed, down migration or historical feedback backfill is required.

Deploy matching API, Git worker/hooks, Java worker and client artifacts under the existing maintenance/writer-drain procedure. Preserve pinned Java isolation, systemd restrictions, private Git storage, secure cookies, one trusted proxy hop, HTTPS and repository authorization. Actual host preflight must pass with enabled runtimes; do not bypass failures or call disabled Git a successful deployment.

The release must pass an external test against `https://origin-slu.duckdns.org/api/v1/git/repositories/REPOSITORY_UUID`: student login, issued repository READ/WRITE credentials, valid-certificate clone, Main.java edit/commit/push, Origin file/history synchronization, second-clone pull, fetch and feature-branch push. Also reject anonymous/cross-user/read-only writes, then check Java assessment and browser checkpoints. Keep credentials out of URLs/commands/logs and use Git's credential prompt. A working website alone does not meet this gate. Actual Azure TLS/DNS/Nginx, service confinement, container Java, provider SMTP and real data remain operator acceptance requirements.

Before new writes, a separately reviewed artifact/config rollback can retain the additive schema. After new writes, preserve and reconcile them; recover only a matching verified database/Git/config pair into fresh resources when recovery is approved. Never drop practice tables, reset repositories or restore the database alone. Reverting this security patch also reintroduces its known vulnerable packages.
