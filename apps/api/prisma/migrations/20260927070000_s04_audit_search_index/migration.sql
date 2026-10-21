CREATE INDEX "audit_events_eventKey_occurredAt_id_idx"
  ON "audit_events" ("eventKey", "occurredAt" DESC, "id" DESC);
