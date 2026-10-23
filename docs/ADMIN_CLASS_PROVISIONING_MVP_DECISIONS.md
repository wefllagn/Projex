# Admin and Instructor Class Provisioning MVP decisions

Approved work order: Product Owner, 2026-10-19. This document records that order;
it does not grant integration, deployment, normal-data migration or role expansion.

## Normal teaching workflow

An ACTIVE Instructor creates their own ACTIVE Class directly, without Admin
approval or a Course-catalog prerequisite. Projex generates a separate enrollment
join code; Students join, then the teaching staff use existing Activity and Group
Project workflows. The authenticated Instructor owns the Class and cannot submit
someone else's Instructor ID. Students cannot create Classes.

Required creation fields: Class name, Semester / Term (First Semester, Second
Semester, Short Term), and a consecutive academic-year pair such as 2026-2027.
Section, schedule, days/time and room are optional. The UI offers seven rolling
academic years around the current year; the server validates the consecutive-pair
format rather than inventing a policy that forbids other valid academic years.

No Formal/Informal classification appears in the user-facing Class workflow.
Existing Class UUIDs, Course relations, official snapshots, staff, memberships,
academic history and authorization rules remain intact; no migration is required.

## Administrative support

Admin uses existing Student/Instructor account provisioning, setup, status/session
management, Class listing/corrections, join-code/roster governance, and reasoned
Primary assignment/recovery. Exceptional Class creation selects an ACTIVE
Instructor and creates a working Class, without a mandatory Course or a new
approval queue. Existing version/reason/history controls remain authoritative.

Role is selected through existing supported Student/Instructor provisioning.
There is no arbitrary role-conversion endpoint or role editor; this order does
not justify granting one. Admin remains unable to inspect private Git source,
issue Git credentials, author academic work, grade or impersonate teaching staff.

## Internal compatibility and exclusions

Store normal term labels in the existing semester text column. The older official
catalog path has a two-value academic_period enum and a database constraint tying
official Class code to Course/period/year. Preserve that path and its audited
correction controls as optional compatibility, not routine creation prerequisites.
Do not coerce Short Term into either old enum value or add a migration to extend it.
Legacy values remain readable; unrelated edits do not rewrite saved term/year.
Changed term/year values must pass the standardized validation.

No curriculum, teaching-load/department approval, new offering subsystem, browser
editor, IDE, Docker, Azure or deployment. Group final acceptance remains separate.
Missing demo metadata recovery is deferred; preserved Git storage stays untouched.

## Verification and data safety

Use a new disposable loopback PostgreSQL cluster, not the shared demo database.
Verify database identity, port, cluster directory and exclusive fixture use before
cleanup. Run mutable suites serially. Normal DB migrations and data changes remain
unauthorized. The Product Owner separately approved three fictional review accounts
and a private temporary credential file for browser checks; none belongs in Git.
