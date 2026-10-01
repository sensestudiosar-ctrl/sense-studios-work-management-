-- Kept separate so PostgreSQL commits the new enum label before guards use it.
ALTER TYPE "AccountKind" ADD VALUE 'CLIENT';
