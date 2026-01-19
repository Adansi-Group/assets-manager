

import { useEffect, useState } from "react";
import { User, Mail, Shield, Save } from "lucide-react";

type ProfileData = {
  name: string;
  email: string;
  role: string;
};

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    role: "Administrator",
  });

  const [saved, setSaved] = useState(false);

  // Load profile
  useEffect(() => {
    const stored = localStorage.getItem("adminProfile");
    if (stored) {
      setProfile(JSON.parse(stored));
    } else {
      // default profile
      const defaultProfile = {
        name: "Admin User",
        email: "admin@example.com",
        role: "Administrator",
      };
      localStorage.setItem(
        "adminProfile",
        JSON.stringify(defaultProfile)
      );
      setProfile(defaultProfile);
    }
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
    setSaved(false);
  }

  function saveProfile() {
    localStorage.setItem(
      "adminProfile",
      JSON.stringify(profile)
    );
    setSaved(true);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow p-6 flex items-center gap-6">
        <div className="h-20 w-20 rounded-full bg-green-700 text-white flex items-center justify-center text-3xl font-bold">
          {profile.name.charAt(0)}
        </div>

        <div>
          <h2 className="text-2xl font-semibold">
            {profile.name}
          </h2>
          <p className="text-gray-500">{profile.role}</p>
        </div>
      </div>

      {/* PROFILE FORM */}
      <div className="bg-white rounded-xl shadow p-6 space-y-6">
        <h3 className="text-lg font-semibold">
          Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NAME */}
          <div>
            <label className="text-sm text-gray-600">
              Full Name
            </label>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
              <User size={16} className="text-gray-400" />
              <input
                name="name"
                value={profile.name}
                onChange={handleChange}
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-sm text-gray-600">
              Email Address
            </label>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
              <Mail size={16} className="text-gray-400" />
              <input
                name="email"
                value={profile.email}
                onChange={handleChange}
                className="w-full outline-none"
              />
            </div>
          </div>

          {/* ROLE */}
          <div>
            <label className="text-sm text-gray-600">
              Role
            </label>
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-100">
              <Shield size={16} className="text-gray-400" />
              <input
                value={profile.role}
                disabled
                className="w-full bg-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex items-center gap-4">
          <button
            onClick={saveProfile}
            className="flex items-center gap-2 bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-800"
          >
            <Save size={16} />
            Save Changes
          </button>

          {saved && (
            <span className="text-green-600 text-sm">
              Profile saved successfully
            </span>
          )}
        </div>
      </div>

      {/* SECURITY */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold">
          Security
        </h3>

        <p className="text-sm text-gray-500">
          Password management will be enabled when authentication
          is connected.
        </p>

        <button
          disabled
          className="bg-gray-300 text-gray-600 px-5 py-2 rounded-lg cursor-not-allowed"
        >
          Change Password
        </button>
      </div>
    </div>
  );
}
