-- PostgreSQL must commit a new enum value before a later migration can use it.
ALTER TYPE "execution_job_type" ADD VALUE 'INSTRUCTOR_REVIEW_RUN';
