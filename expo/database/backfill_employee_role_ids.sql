-- ============================================
-- BACKFILL EMPLOYEE ROLE IDS
-- ============================================
-- Align employees.role_id with employee_roles.id by matching role name.
-- Safe to run multiple times (idempotent).

UPDATE public.employees e
SET role_id = r.id
FROM public.employee_roles r
WHERE e.role_id IS NULL
  AND e.role IS NOT NULL
  AND e.role <> ''
  AND r.business_id = e.business_id
  AND lower(r.name) = lower(e.role);


