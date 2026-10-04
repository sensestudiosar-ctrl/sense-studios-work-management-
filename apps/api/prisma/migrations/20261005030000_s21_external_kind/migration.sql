-- Commit the additive enum value before the following migration uses it.
ALTER TYPE "AccountKind" ADD VALUE 'EXTERNAL';
