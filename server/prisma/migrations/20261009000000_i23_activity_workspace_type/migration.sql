-- PostgreSQL must commit the enum extension before a later migration uses it in a constraint.
ALTER TYPE "repository_type" ADD VALUE 'ACTIVITY_WORKSPACE';
