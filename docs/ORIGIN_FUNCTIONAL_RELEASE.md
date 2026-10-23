# Origin functional release candidate

Base: ui/origin-phase2-polish at 2f5831ef8a3f8cc98acd66127e0158e28a2f8ae5. Work only on release/origin-functional-completion.

## Decisions and internal checkpoints

- Preserve all three presentation environments and the Phase 2 working tree. The RC uses a separate loopback cluster on 55496 and separate storage/credentials; no presentation migration or service restart.
- Retain aggregate automated correction and its original evidence/history. Preview persisted grading values; require explicit saves before release.
- Minimal rubrics: named point maxima, frozen on publication, snapshotted at submission, individual awarded points summed into the existing Instructor score. Legacy null rubric configuration retains aggregate scoring.
- Gradebook uses only credited released graded results in Prelim/Midterm/Final or explicit Unassigned, with per-Student released-only denominators. Ungraded, pending and missing are explicit and excluded from numeric totals. This is not a university course grade.
- Activated Student/Instructor recovery reuses opaque token provisioning, short expiry, single use, session revocation and safe private link delivery; no mail service or Admin password disclosure.
- Only approved visual delta: existing Activity outline icon with restrained bordered frame. New controls reuse existing forms, tables, tabs and dialogs.

Verification and migration/recovery evidence will be recorded here before final delivery.
