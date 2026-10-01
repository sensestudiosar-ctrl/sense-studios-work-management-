CREATE OR REPLACE FUNCTION "check_s13_comment_evidence"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE annotation JSONB;
BEGIN
 IF jsonb_array_length(NEW."annotations")>100 THEN RAISE EXCEPTION 'Too many review annotations'; END IF;
 FOR annotation IN SELECT value FROM jsonb_array_elements(NEW."annotations") LOOP
  IF jsonb_typeof(annotation) IS DISTINCT FROM 'object' OR jsonb_typeof(annotation->'page') IS DISTINCT FROM 'number' OR (annotation->>'page')::numeric<1 OR (annotation->>'page')::numeric<>trunc((annotation->>'page')::numeric) OR jsonb_typeof(annotation->'x') IS DISTINCT FROM 'number' OR (annotation->>'x')::numeric NOT BETWEEN 0 AND 1 OR jsonb_typeof(annotation->'y') IS DISTINCT FROM 'number' OR (annotation->>'y')::numeric NOT BETWEEN 0 AND 1 OR coalesce(length(btrim(annotation->>'text')),0) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid structured review annotation'; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM "review_rounds" r JOIN "audit_events" a ON a."organizationId"=NEW."organizationId" AND a."eventKey"='review.commented' AND a."subjectId"=NEW."roundId"::text AND a."actorId"=NEW."authorId" AND a."reason"=NEW."reason" AND a."after"->>'commentId'=NEW."id"::text AND a."after"->>'roundId'=NEW."roundId"::text AND a."after"->>'markupFileId' IS NOT DISTINCT FROM NEW."markupFileId"::text AND (a."after"->>'annotationCount')::int=jsonb_array_length(NEW."annotations") WHERE r."id"=NEW."roundId" AND r."projectId"=NEW."projectId" AND r."organizationId"=NEW."organizationId" AND "s11_canonical_delivery"(a."id")) THEN RAISE EXCEPTION 'Review comment requires exact canonical evidence'; END IF;
 IF NEW."markupFileId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM "documents" d WHERE d."id"=NEW."markupFileId" AND d."organizationId"=NEW."organizationId" AND d."projectId"=NEW."projectId") THEN RAISE EXCEPTION 'Markup file must belong to review project'; END IF;
 RETURN NULL;
END $$;
