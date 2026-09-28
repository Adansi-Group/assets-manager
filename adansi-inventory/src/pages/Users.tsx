// src/pages/Users.tsx

import { useEffect, useState } from "react";
import { isUserRole, type User, type UserRole } from "../types/users";
import type { Member } from "../types/member";
import { getMembers, addMember, updateMember, removeMember } from "../services/memberService";
import { memberChangeProblem, memberEntryProblem } from "../access/members";
import { accessErrorMessage } from "../toners/accessErrors";
import { Users as UsersIcon, Plus, Edit, Trash2, Shield, Mail, UserCheck } from "lucide-react";
import Swal from "sweetalert2";

/** Names, emails and departments are typed by people; keep them out of the Swal markup's way. */
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function Users({ currentUser }: { currentUser: User }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const list = await getMembers();
      setMembers(list);
      setLoadError(null);
    } catch (error) {
      console.error("Error loading members:", error);
      setLoadError(accessErrorMessage(error, "members"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser() {
    const result = await Swal.fire({
      title: "Add New User",
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input id="email" type="email" class="swal2-input w-full" placeholder="user@example.com">
            <p class="text-xs text-gray-500 mt-1">They sign in with the Google account for this email.</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Name</label>
            <input id="name" type="text" class="swal2-input w-full" placeholder="John Doe">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Role</label>
            <select id="role" class="swal2-input w-full">
              <option value="Admin">Admin</option>
              <option value="IT Manager">IT Manager</option>
              <option value="HR Manager">HR Manager</option>
              <option value="Viewer" selected>Viewer</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Department</label>
            <input id="department" type="text" class="swal2-input w-full" placeholder="IT, HR, Finance, etc.">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Add User",
      confirmButtonColor: "#16a34a",
      width: 600,
      preConfirm: () => {
        const email = (document.getElementById("email") as HTMLInputElement).value;
        const name = (document.getElementById("name") as HTMLInputElement).value;
        const role = (document.getElementById("role") as HTMLSelectElement).value as UserRole;
        const department = (document.getElementById("department") as HTMLInputElement).value;

        if (!email || !name || !role) {
          Swal.showValidationMessage("Please fill in all required fields");
          return false;
        }

        return { email, name, role, department };
      }
    });

    if (result.isConfirmed && result.value) {
      const { email, name, role, department } = result.value;

      try {
        await addMember({ email, name, role, department: department || undefined }, currentUser.email);

        Swal.fire({
          icon: "success",
          title: "User Added!",
          html: `<p>${escapeHtml(name)} has been added successfully</p>`,
          timer: 3000,
          showConfirmButton: true,
        });
      } catch (error) {
        console.error("Error adding member:", error);
        Swal.fire({
          icon: "error",
          title: "Add Failed",
          text: accessErrorMessage(error, "members"),
        });
      } finally {
        await loadUsers();
      }
    }
  }

  async function handleEditUser(member: Member) {
    const result = await Swal.fire({
      title: "Edit User",
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input id="email" type="email" class="swal2-input w-full" value="${escapeHtml(member.email)}" disabled>
            <p class="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Name</label>
            <input id="name" type="text" class="swal2-input w-full" value="${escapeHtml(member.name)}">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Role</label>
            <select id="role" class="swal2-input w-full">
              ${isUserRole(member.role) ? "" : '<option value="" selected disabled>Pick a role</option>'}
              <option value="Admin" ${member.role === "Admin" ? "selected" : ""}>Admin</option>
              <option value="IT Manager" ${member.role === "IT Manager" ? "selected" : ""}>IT Manager</option>
              <option value="HR Manager" ${member.role === "HR Manager" ? "selected" : ""}>HR Manager</option>
              <option value="Viewer" ${member.role === "Viewer" ? "selected" : ""}>Viewer</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Department</label>
            <input id="department" type="text" class="swal2-input w-full" value="${escapeHtml(member.department || "")}" placeholder="IT, HR, Finance, etc.">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Update",
      confirmButtonColor: "#16a34a",
      width: 600,
      preConfirm: () => {
        const name = (document.getElementById("name") as HTMLInputElement).value;
        const role = (document.getElementById("role") as HTMLSelectElement).value as UserRole;
        const department = (document.getElementById("department") as HTMLInputElement).value;

        if (!name || !role) {
          Swal.showValidationMessage("Please fill in all required fields");
          return false;
        }

        return { name, role, department };
      }
    });

    if (result.isConfirmed && result.value) {
      const { name, role, department } = result.value;

      const problem = memberChangeProblem(currentUser.email, member, { kind: "edit", role });
      if (problem) {
        Swal.fire({ icon: "error", title: "Can't Update", text: problem });
        return;
      }

      try {
        await updateMember(member.email, { name, role, department: department || undefined });

        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "User has been updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error updating member:", error);
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: accessErrorMessage(error, "members"),
        });
      } finally {
        await loadUsers();
      }
    }
  }

  async function handleDeleteUser(member: Member) {
    const problem = memberChangeProblem(currentUser.email, member, { kind: "remove" });
    if (problem) {
      Swal.fire({ icon: "error", title: "Can't Remove", text: problem });
      return;
    }

    const result = await Swal.fire({
      title: "Remove User?",
      html: `
        <p>Remove <strong>${escapeHtml(member.name)}</strong> (${escapeHtml(member.email)})? They will no longer be able to sign in.</p>
        <p class="text-xs text-gray-500 mt-3">Their Google or password account itself is not deleted.</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, remove",
    });

    if (result.isConfirmed) {
      try {
        await removeMember(member.email);

        Swal.fire({
          icon: "success",
          title: "Removed!",
          text: "User has been removed",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error removing member:", error);
        Swal.fire({
          icon: "error",
          title: "Remove Failed",
          text: accessErrorMessage(error, "members"),
        });
      } finally {
        await loadUsers();
      }
    }
  }

  function getRoleBadgeColor(role: UserRole) {
    switch (role) {
      case "Admin":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "IT Manager":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "HR Manager":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "Viewer":
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 font-medium">{loadError}</p>
          <button
            onClick={() => loadUsers()}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <button
          onClick={handleAddUser}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UsersIcon className="text-blue-600 dark:text-blue-300" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{members.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <Shield className="text-red-600 dark:text-red-300" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {members.filter(m => m.role === "Admin").length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <UserCheck className="text-green-600 dark:text-green-300" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {members.filter(m => m.role === "IT Manager" || m.role === "HR Manager").length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Managers</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <UsersIcon className="text-gray-600 dark:text-gray-300" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {members.filter(m => m.role === "Viewer").length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Viewers</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">User</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Email</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Role</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Department</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Created</th>
              <th className="px-6 py-3 text-left text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const removeProblem = memberChangeProblem(currentUser.email, member, { kind: "remove" });
              const entryProblem = memberEntryProblem(member.email, member);
              return (
                <tr
                  key={member.email}
                  className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                        {member.name && member.name.length > 0 ? member.name[0].toUpperCase() : "?"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                        {entryProblem && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs">{entryProblem}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Mail size={14} />
                      {member.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {member.department || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-xs">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEditUser(member)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit user"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => !removeProblem && handleDeleteUser(member)}
                        disabled={!!removeProblem}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={removeProblem || "Remove user"}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 dark:text-gray-500">
                  No users found. Click "Add User" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
