CREATE FUNCTION "guard_s13_final_attribution"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."status" IN ('APPROVED','CORRECTIONS_REQUIRED','WITHDRAWN')
    AND ROW(NEW."reviewerEmployeeId",NEW."startedAt") IS DISTINCT FROM ROW(OLD."reviewerEmployeeId",OLD."startedAt")
 THEN RAISE EXCEPTION 'Final review attribution is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "review_round_final_attribution" BEFORE UPDATE ON "review_rounds"
 FOR EACH ROW EXECUTE FUNCTION "guard_s13_final_attribution"();
