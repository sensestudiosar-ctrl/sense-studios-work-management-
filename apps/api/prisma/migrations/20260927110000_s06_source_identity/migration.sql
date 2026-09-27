CREATE FUNCTION "protect_crm_source_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CRM sources cannot be deleted'; END IF;
 IF NEW."id"<>OLD."id" OR NEW."organizationId"<>OLD."organizationId"
   OR NEW."name"<>OLD."name" OR NEW."builtIn"<>OLD."builtIn" OR NEW."createdAt"<>OLD."createdAt"
 THEN RAISE EXCEPTION 'CRM source identity cannot change'; END IF;
 IF NEW."updatedAt"<=OLD."updatedAt" THEN RAISE EXCEPTION 'CRM source concurrency token must advance'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "crm_sources_protect" BEFORE UPDATE OR DELETE ON "crm_sources"
FOR EACH ROW EXECUTE FUNCTION "protect_crm_source_identity"();
