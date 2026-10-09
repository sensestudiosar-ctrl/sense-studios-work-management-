-- Re-establish the narrow S27 decision-head update after the table-level REVOKE
-- in migration 115 removed the column grant as well.
REVOKE UPDATE ON ai_runs FROM sense_app_runtime;
GRANT UPDATE("decisionVersion") ON ai_runs TO sense_app_runtime;

DO $$
BEGIN
  IF NOT has_column_privilege('sense_app_runtime', 'ai_runs', 'decisionVersion', 'UPDATE')
    OR has_column_privilege('sense_app_runtime', 'ai_runs', 'result', 'UPDATE')
    OR has_column_privilege('sense_app_runtime', 'ai_runs', 'inputHash', 'UPDATE') THEN
    RAISE EXCEPTION 'S27 runtime column-update privileges are not restricted to decisionVersion';
  END IF;
END
$$;
