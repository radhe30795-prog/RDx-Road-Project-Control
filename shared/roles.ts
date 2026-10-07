/**
 * Role-Based Access Control (RBAC) — single source of truth.
 * Used by the client (nav filtering, route guards) and the server
 * (tRPC procedure guards). Change the matrix here and both sides follow.
 */

export const APP_ROLES = [
  "user",
  "admin",
  "project_manager",
  "qs_billing_engineer",
  "site_engineer",
  "qa_qc_engineer",
  "hr_payroll_manager",
  "site_coordinator",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  user: "Basic User",
  admin: "Admin / GM",
  project_manager: "Project Manager",
  qs_billing_engineer: "QS / Billing Engineer",
  site_engineer: "Site Engineer / Supervisor",
  qa_qc_engineer: "QA / QC Engineer",
  hr_payroll_manager: "HR / Payroll Manager",
  site_coordinator: "Site Coordinator",
};

/**
 * Which pages (route paths) each role may open.
 * "admin" uses ["*"] = everything.
 * "user" = freshly joined, role not assigned yet → dashboard only.
 */
export const ROLE_PAGES: Record<AppRole, string[]> = {
  admin: ["*"],

  project_manager: [
    "/",
    "/my-apps",
    "/roads",
    "/structures",
    "/activities",
    "/work-programme",
    "/boq",
    "/emb",
    "/daily-progress",
    "/inventory",
    "/material-variance",
    "/subcontractors",
    "/machinery",
    "/signoffs",
    "/reports",
    "/billing",
    "/rate-analysis",
    "/bbs",
    "/projection",
    "/hindrances",
    "/qa-qc",
    "/materials",
    "/documents",
    "/mobile-field",
  ],

  qs_billing_engineer: [
    "/",
    "/my-apps",
    "/roads",
    "/structures",
    "/activities",
    "/work-programme",
    "/boq",
    "/emb",
    "/daily-progress",
    "/reports",
    "/billing",
    "/rate-analysis",
    "/bbs",
    "/projection",
    "/documents",
  ],

  // Site supervisor (e.g. Kot Majhapara): DPR entry + view-only site data.
  // NO BOQ rates, NO billing, NO import, NO master edits.
  site_engineer: [
    "/",
    "/my-apps",
    "/roads",
    "/structures",
    "/activities",
    "/work-programme",
    "/daily-progress",
    "/machinery",
    "/materials",
    "/hindrances",
    "/documents",
    "/mobile-field",
  ],

  qa_qc_engineer: [
    "/",
    "/my-apps",
    "/daily-progress",
    "/activities",
    "/work-programme",
    "/qa-qc",
    "/documents",
    "/mobile-field",
  ],

  hr_payroll_manager: ["/", "/my-apps", "/hr", "/hr-letters"],

  // Site Coordinator: HR + Material + DPR + Machinery (site-level ops, no commercial data)
  site_coordinator: [
    "/",
    "/my-apps",
    "/roads",
    "/hr",
    "/hr-letters",
    "/materials",
    "/inventory",
    "/daily-progress",
    "/machinery",
    "/activities",
    "/work-programme",
    "/hindrances",
    "/documents",
    "/mobile-field",
  ],

  user: ["/", "/my-apps"],
};

export function canAccessPage(
  role: string | null | undefined,
  path: string,
): boolean {
  const pages =
    (role && (ROLE_PAGES as Record<string, string[]>)[role]) ||
    ROLE_PAGES.user;
  return pages.includes("*") || pages.includes(path);
}

/** Roles allowed to SEE and EDIT commercial data (BOQ rates, billing, e-MB). */
export const COMMERCIAL_ROLES: string[] = [
  "admin",
  "project_manager",
  "qs_billing_engineer",
];

export function isCommercialRole(role: string | null | undefined): boolean {
  return !!role && COMMERCIAL_ROLES.includes(role);
}
