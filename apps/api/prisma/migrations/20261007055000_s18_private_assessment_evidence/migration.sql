-- Keep authored quiz answer keys out of general audit payloads while binding exact private content.
CREATE FUNCTION s18_safe_library_content(value jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$ DECLARE result jsonb:=value; quiz jsonb; BEGIN
 IF jsonb_typeof(value->'assessment'->'quiz')='array' THEN
  SELECT coalesce(jsonb_agg(item - 'correctOptionIds'),'[]'::jsonb) INTO quiz FROM jsonb_array_elements(value->'assessment'->'quiz') item;
  result:=jsonb_set(result,'{assessment,quiz}',quiz);
 END IF;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION s18_library_version_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE a audit_events; r library_records; BEGIN
 SELECT * INTO r FROM library_records WHERE id=NEW."recordId";
 a:=s18_skill_event(NEW."eventId",NEW."organizationId",NEW."actorId",'library.version_created','library_record',NEW."recordId");
 IF a.reason IS DISTINCT FROM NEW.reason OR a.after->>'versionId' IS DISTINCT FROM NEW.id::text OR (a.after->>'version')::int IS DISTINCT FROM NEW.version OR a.after->'content' IS DISTINCT FROM s18_safe_library_content(NEW.content) OR (a.after->>'acknowledgementRequired')::boolean IS DISTINCT FROM NEW."acknowledgementRequired" OR a.after->>'kind' IS DISTINCT FROM r.kind OR (NEW.version>1 AND NOT EXISTS(SELECT 1 FROM library_versions WHERE "recordId"=NEW."recordId" AND version=NEW.version-1)) THEN RAISE EXCEPTION 'Library exact private-content/version evidence mismatch'; END IF;
 -- The private authoritative JSON is append-only. Safe audit content deliberately excludes answers.
 RETURN NEW;
END $$;
