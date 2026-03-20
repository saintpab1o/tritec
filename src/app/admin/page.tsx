"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Image from "next/image";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  title: string;
  headshot: string;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newGender, setNewGender] = useState<"M" | "F">("M");
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  const login = async () => {
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setAuthenticated(true);
        loadEmployees(data.token);
      } else {
        setAuthError("Invalid password");
      }
    } catch {
      setAuthError("Login failed");
    }
  };

  const loadEmployees = async (authToken?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${authToken || token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch (e) {
      console.error("Failed to load employees:", e);
    }
    setLoading(false);
  };

  const addEmployee = async () => {
    if (!newFirst.trim() || !newLast.trim() || !newTitle.trim()) return;
    setAdding(true);

    const formData = new FormData();
    formData.append("firstName", newFirst.trim());
    formData.append("lastName", newLast.trim());
    formData.append("title", newTitle.trim());
    formData.append("gender", newGender);
    if (newPhoto) formData.append("headshot", newPhoto);

    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        setNewFirst("");
        setNewLast("");
        setNewTitle("");
        setNewPhoto(null);
        if (fileRef.current) fileRef.current.value = "";
        setShowAddForm(false);
        loadEmployees();
      }
    } catch (e) {
      console.error("Failed to add employee:", e);
    }
    setAdding(false);
  };

  const removeEmployee = async (id: string) => {
    if (!confirm("Remove this employee from the quiz?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/employees?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadEmployees();
    } catch (e) {
      console.error("Failed to delete employee:", e);
    }
    setDeleting(null);
  };

  const clearLeaderboard = async () => {
    if (!confirm("Clear ALL leaderboard scores? This cannot be undone.")) return;
    try {
      await fetch("/api/admin/leaderboard", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Leaderboard cleared.");
    } catch (e) {
      console.error("Failed to clear leaderboard:", e);
    }
  };

  const filtered = employees.filter(
    (e) =>
      e.displayName.toLowerCase().includes(search.toLowerCase()) ||
      e.title.toLowerCase().includes(search.toLowerCase())
  );

  // Login gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <Header />
        <main className="max-w-sm mx-auto px-4 pt-24">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-fade-in-up">
            <div className="w-14 h-14 bg-tritec-blue/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-tritec-blue" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-tritec-blue mb-1">Admin Login</h2>
            <p className="text-gray-400 text-sm mb-5">Enter the admin password to continue</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="Password"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center font-medium focus:border-tritec-blue focus:outline-none transition-colors mb-3"
              autoFocus
            />
            {authError && (
              <p className="text-red-500 text-xs font-medium mb-3">{authError}</p>
            )}
            <button
              onClick={login}
              className="w-full py-3 bg-tritec-blue text-white font-display font-semibold rounded-xl hover:bg-tritec-blue-light transition-all"
            >
              Log In
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header />
      <main className="max-w-4xl mx-auto px-4 pt-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-tritec-blue">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">{employees.length} employees</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearLeaderboard}
              className="px-4 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              Clear Leaderboard
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 text-sm font-semibold text-white bg-tritec-blue hover:bg-tritec-blue-light rounded-xl transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Employee
            </button>
          </div>
        </div>

        {/* Add employee form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 animate-fade-in-up">
            <h3 className="font-display font-semibold text-tritec-blue mb-4">New Employee</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <input
                type="text"
                value={newFirst}
                onChange={(e) => setNewFirst(e.target.value)}
                placeholder="First Name"
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-tritec-blue focus:outline-none transition-colors"
              />
              <input
                type="text"
                value={newLast}
                onChange={(e) => setNewLast(e.target.value)}
                placeholder="Last Name"
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-tritec-blue focus:outline-none transition-colors"
              />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Job Title"
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-tritec-blue focus:outline-none transition-colors"
              />
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value as "M" | "F")}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-tritec-blue focus:outline-none transition-colors bg-white"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewPhoto(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-tritec-blue/5 file:text-tritec-blue hover:file:bg-tritec-blue/10 transition-colors"
                />
              </label>
              <button
                onClick={addEmployee}
                disabled={adding || !newFirst.trim() || !newLast.trim() || !newTitle.trim()}
                className="px-6 py-2.5 bg-tritec-gold text-white font-semibold text-sm rounded-xl hover:bg-tritec-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {adding ? "Adding..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full px-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-sm focus:border-tritec-blue focus:outline-none transition-colors"
          />
        </div>

        {/* Employee list */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-[48px_56px_1fr_1fr_48px] gap-3 px-5 py-3 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <div>#</div>
              <div>Photo</div>
              <div>Name</div>
              <div>Title</div>
              <div></div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {filtered.map((emp, i) => (
                <div
                  key={emp.id}
                  className="grid grid-cols-[48px_56px_1fr_1fr_48px] gap-3 px-5 py-2.5 items-center hover:bg-gray-50/50 transition-colors"
                >
                  <span className="text-xs text-gray-400 font-medium">{i + 1}</span>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={emp.headshot}
                      alt={emp.displayName}
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 truncate">{emp.displayName}</span>
                  <span className="text-sm text-gray-500 truncate">{emp.title}</span>
                  <button
                    onClick={() => removeEmployee(emp.id)}
                    disabled={deleting === emp.id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remove employee"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
