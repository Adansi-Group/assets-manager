






// src/types/users.ts

export type UserRole = "Admin" | "IT Manager" | "HR Manager" | "Viewer";

export type Permission = 
  | "view_dashboard"
  | "view_printers" | "manage_printers"
  | "view_toners" | "manage_toners"
  | "view_gadgets" | "manage_gadgets"
  | "view_a4_sheets" | "manage_a4_sheets"
  | "view_internet_usage" | "manage_internet_usage"
  | "view_inventory" | "manage_inventory"  // <-- ADDED
  | "view_reports"
  | "manage_users"
  | "manage_settings";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  createdAt: string;
  lastLogin?: string;
}

// Define what each role can do
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  "Admin": [
    "view_dashboard",
    "view_printers", "manage_printers",
    "view_toners", "manage_toners",
    "view_gadgets", "manage_gadgets",
    "view_a4_sheets", "manage_a4_sheets",
    "view_internet_usage", "manage_internet_usage",
    "view_inventory", "manage_inventory",  // <-- ADDED
    "view_reports",
    "manage_users",
    "manage_settings"
  ],
  "IT Manager": [
    "view_dashboard",
    "view_printers", "manage_printers",
    "view_toners", "manage_toners",
    "view_a4_sheets", "manage_a4_sheets",
    "view_internet_usage", "manage_internet_usage",
    "view_inventory", "manage_inventory",  // <-- ADDED
    "view_reports"
  ],
  "HR Manager": [
    "view_dashboard",
    "view_gadgets", "manage_gadgets",
    "view_reports"
  ],
  "Viewer": [
    "view_dashboard",
    "view_printers",
    "view_toners",
    "view_gadgets",
    "view_a4_sheets",
    "view_internet_usage",
    "view_inventory",  // <-- ADDED (view only)
    "view_reports"
  ]
};

// Helper function to check if user has a specific permission
export function hasPermission(user: User, permission: Permission): boolean {
  const userPermissions = ROLE_PERMISSIONS[user.role];
  return userPermissions.includes(permission);
}

// Helper function to check if user can manage a module (has both view and manage permissions)
export function canManage(user: User, module: string): boolean {
  const managePermission = `manage_${module}` as Permission;
  return hasPermission(user, managePermission);
}

// Helper function to check if user can view a module
export function canView(user: User, module: string): boolean {
  const viewPermission = `view_${module}` as Permission;
  return hasPermission(user, viewPermission);
}