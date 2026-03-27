-- Allow pending status for advertisements
ALTER TABLE advertisements
  DROP CONSTRAINT IF EXISTS advertisements_status_check;

ALTER TABLE advertisements
  ADD CONSTRAINT advertisements_status_check
  CHECK (status IN ('draft', 'pending', 'active', 'paused', 'archived'));

