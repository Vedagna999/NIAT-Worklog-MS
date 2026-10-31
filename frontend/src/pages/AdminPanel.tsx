import React, { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  Users,
  Settings,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  FolderPlus,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { UserDetail, UserBrief, Category, UserRole, UserStatus, ActivityGroup } from '../types';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [managers, setManagers] = useState<UserBrief[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState<boolean>(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [isReopenOpen, setIsReopenOpen] = useState<boolean>(false);

  // Form states
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('MENTOR');
  const [newManagerId, setNewManagerId] = useState<string>('');

  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('MENTOR');
  const [editStatus, setEditStatus] = useState<UserStatus>('ACTIVE');
  const [editManagerId, setEditManagerId] = useState<string>('');

  // Category form state
  const [catName, setCatName] = useState('');
  const [catGroup, setCatGroup] = useState<ActivityGroup>('MENTORING');
  const [catQualifies, setCatQualifies] = useState<boolean>(true);

  // Reopen log form state
  const [reopenWorklogId, setReopenWorklogId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [uList, mList, cList] = await Promise.all([
        api.getAllUsers(),
        api.getManagersList(),
        api.getCategories(),
      ]);
      setUsers(uList);
      setManagers(mList);
      setCategories(cList);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load administrative data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        full_name: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
        manager_id: newRole === 'MENTOR' && newManagerId ? newManagerId : null,
        status: 'ACTIVE',
      });
      setSuccessMsg(`User ${newFullName} created successfully.`);
      setIsAddUserOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewManagerId('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user.');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.updateUser(editingUser.id, {
        full_name: editFullName.trim(),
        role: editRole,
        status: editStatus,
        manager_id: editRole === 'MENTOR' ? (editManagerId || null) : null,
      });
      setSuccessMsg(`User ${editFullName} updated successfully.`);
      setIsEditUserOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCategory({
        name: catName.trim(),
        activity_group: catGroup,
        qualifies_for_six_hours: catQualifies,
      });
      setSuccessMsg(`Category ${catName} created.`);
      setIsAddCategoryOpen(false);
      setCatName('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create category.');
    }
  };

  const handleReopenWorklog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenWorklogId.trim()) return;
    try {
      const resp = await api.reopenWorklog(reopenWorklogId.trim());
      setSuccessMsg(resp.message || 'Worklog reopened successfully.');
      setIsReopenOpen(false);
      setReopenWorklogId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reopen worklog.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Administrator Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage user accounts, mentor-manager mappings, categories, and reopen locked logs after deadlines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
          <button
            onClick={() => setIsAddCategoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            Add Category
          </button>
          <button
            onClick={() => setIsReopenOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            Reopen Locked Log
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* User Accounts & Mentor-Manager Mapping Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">User Accounts & Roles</h2>
            <p className="text-xs text-slate-500">
              {users.length} registered accounts across Mentors, Managers, and Admins
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Manager</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => {
                const mgr = managers.find((m) => m.id === u.manager_id);
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.full_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'MANAGER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.role === 'MENTOR' ? (
                        mgr ? (
                          <span className="font-semibold text-slate-800">{mgr.full_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditFullName(u.full_name);
                          setEditRole(u.role);
                          setEditStatus(u.status);
                          setEditManagerId(u.manager_id || '');
                          setIsEditUserOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Categories Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <h2 className="text-base font-bold text-slate-900">Activity Categories</h2>
          <p className="text-xs text-slate-500">
            Organizational categories configured for worklog classification
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Group Classification</th>
                <th className="py-3 px-4">Qualifies for 6-Hour Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-[10px]">
                      {c.activity_group}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {c.qualifies_for_six_hours ? (
                      <span className="text-emerald-600 font-semibold">Yes (Qualifying)</span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="rahul@niat.edu"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="MENTOR">MENTOR</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              {newRole === 'MENTOR' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign Manager</label>
                  <select
                    value={newManagerId}
                    onChange={(e) => setNewManagerId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Select Manager --</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit User Account</h3>
            <form onSubmit={handleEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="MENTOR">MENTOR</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              {editRole === 'MENTOR' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign Manager</label>
                  <select
                    value={editManagerId}
                    onChange={(e) => setEditManagerId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- No Manager --</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Activity Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Assessment Review"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Activity Group</label>
                <select
                  value={catGroup}
                  onChange={(e) => setCatGroup(e.target.value as ActivityGroup)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="LEARNING">LEARNING</option>
                  <option value="MENTORING">MENTORING</option>
                  <option value="INVIGILATION">INVIGILATION</option>
                  <option value="ADMINISTRATIVE">ADMINISTRATIVE</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="qualifiesChk"
                  checked={catQualifies}
                  onChange={(e) => setCatQualifies(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <label htmlFor="qualifiesChk" className="text-xs text-slate-700 font-medium">
                  Qualifies for 6-Hour Target Threshold
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Worklog Modal */}
      {isReopenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Reopen Locked Worklog</h3>
            <p className="text-xs text-slate-500 mb-4">
              Allows administrators to reopen a locked or overdue worklog back to DRAFT so the mentor can make corrections.
            </p>
            <form onSubmit={handleReopenWorklog} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Worklog UUID</label>
                <input
                  type="text"
                  value={reopenWorklogId}
                  onChange={(e) => setReopenWorklogId(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReopenOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                >
                  Reopen to DRAFT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
