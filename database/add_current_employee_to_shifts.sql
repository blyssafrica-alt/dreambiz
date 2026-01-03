-- Add current_employee_id to pos_shifts table for shift handover tracking
-- This tracks which employee is currently working the shift

ALTER TABLE pos_shifts 
ADD COLUMN IF NOT EXISTS current_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pos_shifts_current_employee ON pos_shifts(current_employee_id) WHERE current_employee_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN pos_shifts.current_employee_id IS 'Employee currently working this shift (for handover tracking)';

