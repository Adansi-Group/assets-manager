



import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { updateProfile, updatePassword } from "firebase/auth";
import { User, Mail, Shield, Save, Key, Camera, ArrowLeft } from "lucide-react";
import Swal from "sweetalert2";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setDisplayName(currentUser.displayName || "");
      setEmail(currentUser.email || "");
    }
  }, []);

  async function handleUpdateProfile() {
    if (!user) return;

    setLoading(true);
    try {
      await updateProfile(user, {
        displayName: displayName,
      });

      Swal.fire({
        icon: "success",
        title: "Profile Updated",
        text: "Your profile has been updated successfully",
        timer: 1500,
        showConfirmButton: false,
      });

      setUser(auth.currentUser);
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword() {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Passwords Don't Match",
        text: "Please make sure both passwords match",
      });
      return;
    }

    if (newPassword.length < 6) {
      Swal.fire({
        icon: "error",
        title: "Password Too Short",
        text: "Password must be at least 6 characters",
      });
      return;
    }

    setLoading(true);
    try {
      await updatePassword(user, newPassword);

      Swal.fire({
        icon: "success",
        title: "Password Changed",
        text: "Your password has been changed successfully",
        timer: 1500,
        showConfirmButton: false,
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        Swal.fire({
          icon: "error",
          title: "Re-authentication Required",
          text: "Please log out and log back in before changing your password",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  function getInitials(name: string, email: string) {
    if (name && name.trim()) {
      // Get first letter only from display name
      return name[0].toUpperCase();
    }
    // Fixed: Check if email exists and has length before accessing [0]
    if (email && email.length > 0) {
      return email[0].toUpperCase();
    }
    return "?"; // Fallback if both are empty
  }

  function getProviderName() {
    if (!user) return "Unknown";
    const provider = user.providerData[0]?.providerId;
    if (provider === "google.com") return "Google";
    if (provider === "password") return "Email/Password";
    return provider || "Unknown";
  }

  if (!user) {
    return (
      <div className="p-6">
        <p>Loading user information...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back</span>
      </button>

      {/* HEADER */}
      <div className="bg-white rounded-xl shadow p-6 flex items-center gap-6">
        <div className="relative">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-teal-600 text-white flex items-center justify-center text-3xl font-bold">
              {getInitials(displayName, email)}
            </div>
          )}
          <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border-2 border-gray-100 hover:bg-gray-50">
            <Camera size={14} className="text-gray-600" />
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            {displayName || "Admin User"}
          </h2>
          <p className="text-gray-500 text-sm">{email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              Administrator
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {getProviderName()}
            </span>
          </div>
        </div>
      </div>

      {/* PROFILE FORM */}
      <div className="bg-white rounded-xl shadow p-6 space-y-6">
        <h3 className="text-lg font-semibold">Personal Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NAME */}
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              Full Name
            </label>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-green-500">
              <User size={16} className="text-gray-400" />
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm text-gray-600 block mb-2">
              Email Address
            </label>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
              <Mail size={16} className="text-gray-400" />
              <input
                value={email}
                disabled
                className="w-full bg-transparent outline-none text-gray-500 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed
            </p>
          </div>

          {/* ROLE */}
          <div>
            <label className="text-sm text-gray-600 block mb-2">Role</label>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
              <Shield size={16} className="text-gray-400" />
              <input
                value="Administrator"
                disabled
                className="w-full bg-transparent outline-none text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleUpdateProfile}
            disabled={loading}
            className="flex items-center gap-2 bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* SECURITY */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Key size={20} />
          Security
        </h3>

        {user.providerData[0]?.providerId === "password" ? (
          <>
            <p className="text-sm text-gray-500">
              Change your account password below
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
          </>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <Shield size={18} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">
                    Google Account Security
                  </h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Your account is secured through Google. To change your
                    password or manage security settings, please visit your
                    Google Account settings.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ACCOUNT INFO */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between py-3 border-b">
            <span className="text-gray-600">Account Created</span>
            <span className="text-gray-900">
              {user.metadata.creationTime
                ? new Date(user.metadata.creationTime).toLocaleDateString()
                : "Unknown"}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b">
            <span className="text-gray-600">Last Sign In</span>
            <span className="text-gray-900">
              {user.metadata.lastSignInTime
                ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                : "Unknown"}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b">
            <span className="text-gray-600">Email Verified</span>
            <span
              className={`font-medium ${
                user.emailVerified ? "text-green-600" : "text-yellow-600"
              }`}
            >
              {user.emailVerified ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b">
            <span className="text-gray-600">Provider</span>
            <span className="text-gray-900">{getProviderName()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}