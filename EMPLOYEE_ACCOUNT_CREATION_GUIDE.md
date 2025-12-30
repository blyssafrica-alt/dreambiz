# Employee Account Creation Guide

## Clarification: Admin vs Business Owner

- **Super Admin**: DreamBiz platform administrators who manage the entire platform
- **Business Owner**: Users who own businesses registered on DreamBiz (clients)
- **Employee**: Staff members added by business owners to help run their business

## Employee Login Setup

When a business owner creates an employee, they can:

1. **Enable Login Access**: Toggle "Can Login" to allow the employee to access the app
2. **Set Email & Password**: If login is enabled, provide email and password
3. **Assign Role**: Select from available employee roles (Manager, Cashier, etc.)

### How It Works

1. Business owner fills in employee details
2. If "Can Login" is enabled:
   - Email and password fields become required
   - System creates an auth user account in Supabase Auth
   - Links the auth user to the employee record via `auth_user_id`
3. Employee can then log in using:
   - Email/password (via `/employee-login` screen)
   - PIN code (future feature)

### Database Fields

- `auth_user_id`: Links employee to Supabase Auth user
- `role_id`: Links employee to an employee role (for permissions)
- `can_login`: Boolean flag indicating if employee can log in
- `pin_code`: For quick PIN-based login (optional, future feature)

