// src/pages/Users.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import type { User, UserRole } from "../types/users";
import { Users as UsersIcon, Plus, Edit, Trash2, Shield, Mail, UserCheck } from "lucide-react";
import Swal from "sweetalert2";

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email || "",
        name: doc.data().name || "Unknown",
        role: doc.data().role || "Viewer",
        department: doc.data().department,
        createdAt: doc.data().createdAt || new Date().toISOString(),
      })) as User[];
      setUsers(usersList);
    } catch (error) {
      console.error("Error loading users:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load users",
      });
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
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Name</label>
            <input id="name" type="text" class="swal2-input w-full" placeholder="John Doe">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Password</label>
            <input id="password" type="password" class="swal2-input w-full" placeholder="Min 6 characters">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Role</label>
            <select id="role" class="swal2-input w-full">
              <option value="Admin">Admin</option>
              <option value="IT Manager">IT Manager</option>
              <option value="HR Manager">HR Manager</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Department</label>
            <input id="department" type="text" class="swal2-input w-full" placeholder="IT, HR, Finance, etc.">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Create User",
      confirmButtonColor: "#16a34a",
      width: 600,
      preConfirm: () => {
        const email = (document.getElementById("email") as HTMLInputElement).value;
        const name = (document.getElementById("name") as HTMLInputElement).value;
        const password = (document.getElementById("password") as HTMLInputElement).value;
        const role = (document.getElementById("role") as HTMLSelectElement).value as UserRole;
        const department = (document.getElementById("department") as HTMLInputElement).value;

        if (!email || !name || !password || !role) {
          Swal.showValidationMessage("Please fill in all required fields");
          return false;
        }

        if (password.length < 6) {
          Swal.showValidationMessage("Password must be at least 6 characters");
          return false;
        }

        return { email, name, password, role, department };
      }
    });

    if (result.isConfirmed && result.value) {
      const { email, name, password, role, department } = result.value;

      Swal.fire({
        title: "Creating user...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // Create user document in Firestore
        const newUser: Omit<User, "id"> = {
          email,
          name,
          role,
          department: department || undefined,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", uid), newUser);

        await loadUsers();

        Swal.fire({
          icon: "success",
          title: "User Created!",
          html: `
            <p>${name} has been added successfully</p>
            <p class="text-sm text-yellow-600 mt-2">⚠️ You may be logged out. Please log back in if needed.</p>
          `,
          timer: 3000,
          showConfirmButton: true,
        });
      } catch (error: any) {
        console.error("Error creating user:", error);
        Swal.fire({
          icon: "error",
          title: "Creation Failed",
          text: error.message || "Failed to create user",
        });
      }
    }
  }

  async function handleEditUser(user: User) {
    const result = await Swal.fire({
      title: "Edit User",
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input id="email" type="email" class="swal2-input w-full" value="${user.email}" disabled>
            <p class="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Name</label>
            <input id="name" type="text" class="swal2-input w-full" value="${user.name}">
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Role</label>
            <select id="role" class="swal2-input w-full">
              <option value="Admin" ${user.role === "Admin" ? "selected" : ""}>Admin</option>
              <option value="IT Manager" ${user.role === "IT Manager" ? "selected" : ""}>IT Manager</option>
              <option value="HR Manager" ${user.role === "HR Manager" ? "selected" : ""}>HR Manager</option>
              <option value="Viewer" ${user.role === "Viewer" ? "selected" : ""}>Viewer</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Department</label>
            <input id="department" type="text" class="swal2-input w-full" value="${user.department || ""}" placeholder="IT, HR, Finance, etc.">
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

      try {
        await updateDoc(doc(db, "users", user.id), {
          name,
          role,
          department: department || undefined,
        });

        await loadUsers();

        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "User has been updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error updating user:", error);
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: "Failed to update user",
        });
      }
    }
  }

  async function handleDeleteUser(user: User) {
    const result = await Swal.fire({
      title: "Delete User?",
      html: `
        <p>Are you sure you want to delete <strong>${user.name}</strong>?</p>
        <p class="text-sm text-gray-600 mt-2">This will:</p>
        <ul class="text-sm text-left text-gray-600 mt-2 ml-4">
          <li>• Remove user from Firestore</li>
          <li>• User will not be able to access the system</li>
          <li>• This action cannot be undone</li>
        </ul>
        <p class="text-xs text-red-600 mt-3">Note: Firebase Auth account will remain but won't have access</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete",
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "users", user.id));
        await loadUsers();

        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "User has been removed",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error deleting user:", error);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: "Failed to delete user",
        });
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
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
                {users.filter(u => u.role === "Admin").length}
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
                {users.filter(u => u.role === "IT Manager" || u.role === "HR Manager").length}
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
                {users.filter(u => u.role === "Viewer").length}
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
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">
                      {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : "?"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ID: {user.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Mail size={14} />
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                  {user.department || "—"}
                </td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit user"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete user"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
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


