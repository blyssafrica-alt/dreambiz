# Supplier flow – manual QA checklist

Use this checklist to verify the supplier sign-up and returning-user flows end-to-end.

---

## Prerequisites

- App built and runnable (Expo dev or production build).
- Admin access to approve applications (or use a test admin account).
- Fresh test account or ability to clear app data / use new email.

---

## A. First-time flow (new user)

| # | Step | Action | Expected result | Pass? |
|---|------|--------|-----------------|-------|
| 1 | Landing | Open app → tap **Become a Supplier** | Navigate to supplier apply entry (not logged in). | ☐ |
| 2 | Entry | Tap **Create account & apply** | Navigate to Sign up (with supplier intent). | ☐ |
| 3 | Sign up | Enter name, email, password → Sign up | Success → redirect to **Verify email** screen. | ☐ |
| 4 | Verify email | Wait on Verify email (no click) | No infinite spinner; screen shows instructions and Check/Resend. | ☐ |
| 5 | Verify email (timeout) | Wait 10+ seconds without verifying | “Taking longer than expected” appears with **Retry** and **Back to Login**. | ☐ |
| 6 | Verify email | Click verification link in email (or use magic link) | Return to app → email verified → redirect to **Onboarding**. | ☐ |
| 7 | Onboarding | Complete business onboarding | Finish → redirect to **Supplier Apply** (supplier intent). | ☐ |
| 8 | Supplier Apply | (Auto) load application | Create/get application → redirect to **Become a Supplier** wizard. | ☐ |
| 9 | Wizard | Fill step 1 (e.g. business name, country) | Form saves; no crash. | ☐ |
| 10 | Wizard | Advance a few steps, then leave and reopen app | Resume at same step (or last saved step). | ☐ |
| 11 | Wizard | Complete all steps → **Submit** | Status → submitted; redirect to **My Application** (pending). | ☐ |
| 12 | My Application | See status “Pending review” / “Submitted” | Submitted date shown; **Refresh** or pull-to-refresh works. | ☐ |
| 13 | Admin | As admin, open Supplier applications → Approve this application | Application approved; profile created; applicant notified (if implemented). | ☐ |
| 14 | Applicant | Reopen app or tap Refresh on My Application | Redirect to **Supplier dashboard** (/supplier). | ☐ |

---

## B. Returning user – Supplier Login

| # | Step | Action | Expected result | Pass? |
|---|------|--------|-----------------|-------|
| 1 | Landing | Tap **Supplier Login** | Navigate to Supplier Login screen. | ☐ |
| 2 | Login | Enter email + password → Sign in | Sign in success. | ☐ |
| 3a | Draft | (User has draft/needs_info) | Redirect to **Become a Supplier** wizard at saved step. | ☐ |
| 3b | Pending | (User has submitted/pending) | Redirect to **My Application**. | ☐ |
| 3c | Approved | (User has approved profile) | Redirect to **Supplier dashboard**. | ☐ |
| 3d | Declined | (User was declined) | Redirect to **My Application** (reapply option). | ☐ |

---

## C. Route guards (no bypass)

| # | Step | Action | Expected result | Pass? |
|---|------|--------|-----------------|-------|
| 1 | Not logged in | Manually open deep link to `/suppliers-marketplace/become-a-supplier` | Redirect to Landing (or supplier-apply entry). | ☐ |
| 2 | Not logged in | Open `/supplier` | Redirect to Landing. | ☐ |
| 3 | Logged in, email not verified | Try to open `/suppliers-marketplace/become-a-supplier` | Redirect to **Verify email**. | ☐ |
| 4 | Logged in, onboarding not done | Try to open `/supplier` | Redirect to **Onboarding**. | ☐ |
| 5 | Logged in, draft | Open `/suppliers-marketplace/my-application` (without submitting) | Redirect to **Become a Supplier** wizard. | ☐ |
| 6 | Logged in, submitted | Open `/supplier` (before approval) | Redirect to **My Application**. | ☐ |
| 7 | Logged in, approved | Open `/supplier-apply` or `/suppliers-marketplace/become-a-supplier` | Redirect to **Supplier dashboard** (/supplier). | ☐ |

---

## D. Verify email deep link (no infinite loading)

| # | Step | Action | Expected result | Pass? |
|---|------|--------|-----------------|-------|
| 1 | Sign up | Complete sign up → get verification email | App shows Verify email screen. | ☐ |
| 2 | Deep link | Open app from verification link (same device or different) | Token handled; session updated; either “Email verified” or redirect; **no endless blue loading**. | ☐ |
| 3 | Already verified | Open verification link again | No error; app shows verified state or redirects to next step. | ☐ |

---

## E. Wizard and My Application UX

| # | Step | Action | Expected result | Pass? |
|---|------|--------|-----------------|-------|
| 1 | Wizard | Progress through steps | Progress indicator reflects current step. | ☐ |
| 2 | Wizard | Leave on step 3, log out, log back in (supplier login) | Resume at step 3 (or last saved step). | ☐ |
| 3 | My Application | Pull to refresh / tap Refresh | Status and date update; no crash. | ☐ |
| 4 | Blocked | On wrong step (e.g. pending user on wizard) | Friendly message or redirect; no blank screen. | ☐ |
| 5 | Layout | All screens (verify-email, onboarding, wizard, my-application, dashboard) | No clipped buttons; content visible; responsive. | ☐ |

---

## Sign-off

- **Tester:** _____________________  
- **Date:** _____________________  
- **Build/Env:** _____________________  
- **All critical paths passed:** ☐ Yes  ☐ No (list failures): _____________________
