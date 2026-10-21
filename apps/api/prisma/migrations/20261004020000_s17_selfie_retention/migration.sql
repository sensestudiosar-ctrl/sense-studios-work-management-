ALTER TABLE workforce_selfies ADD COLUMN "purgeRequestedAt" timestamptz(3), ADD COLUMN "noticeDays" integer;
ALTER TABLE workforce_selfies ADD CONSTRAINT selfie_notice_days CHECK ("noticeDays" IS NULL OR "noticeDays" BETWEEN 1 AND 3650);
CREATE FUNCTION s17_selfie_retention_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE v workforce_versions; BEGIN
 IF NEW."purgeRequestedAt" IS NOT NULL AND (NEW."expiresAt">NEW."purgeRequestedAt" OR NEW."noticeAt" IS NULL OR NEW."noticeDays" IS NULL OR NEW."purgeRequestedAt"<NEW."noticeAt"+make_interval(days=>NEW."noticeDays") OR NEW."holdReason" IS NOT NULL) THEN RAISE EXCEPTION 'Selfie purge intent requires elapsed notice, expiry and no hold'; END IF;
 IF NEW."purgedAt" IS NOT NULL AND NEW."purgeRequestedAt" IS NULL THEN RAISE EXCEPTION 'Selfie purge completion requires durable intent'; END IF;
 SELECT * INTO v FROM workforce_versions WHERE "recordId"=NEW."attendanceId" ORDER BY version DESC LIMIT 1;
 IF v.id IS NULL OR v.data->'selfieRetention'->>'checksum'<>NEW.checksum THEN RAISE EXCEPTION 'Selfie retention change requires exact immutable attendance evidence'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER s17_selfie_retention_evidence AFTER UPDATE ON workforce_selfies DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION s17_selfie_retention_guard();
