import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import { Users, Shield, ShieldOff, Mail } from 'lucide-react';

export default function AdminUsers() {
    const { token, user: currentUser } = useAuthStore();
    const [users, setUsers] = useState([]);

    const fetchUsers = () => {
        axios.get("http://127.0.0.1:8000/api/admin/users", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setUsers(res.data)).catch(console.error);
    };

    useEffect(() => {
        if (token) fetchUsers();
    }, [token]);

    const handleToggleAdmin = async (u) => {
        if (u.id === currentUser?.id) {
            alert("You cannot modify your own admin privileges.");
            return;
        }
        
        const newStatus = u.is_admin ? 0 : 1;
        const confirmMsg = newStatus ? `Promote ${u.username} to Admin?` : `Revoke Admin rights from ${u.username}?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await axios.put(`http://127.0.0.1:8000/api/admin/users/${u.id}/role`, {
                is_admin: newStatus
            }, { headers: { Authorization: `Bearer ${token}` }});
            fetchUsers();
        } catch (e) {
            alert(e.response?.data?.detail || "An error occurred");
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                        User Management
                    </h1>
                    <p className="text-gray-400 mt-2">Manage user roles and administrative privileges.</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400 border border-orange-500/20">
                    <Users className="w-8 h-8" />
                </div>
            </div>

            <div className="bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-widest text-gray-400">
                            <th className="p-4 font-bold">ID</th>
                            <th className="p-4 font-bold">Username</th>
                            <th className="p-4 font-bold">Email</th>
                            <th className="p-4 font-bold">Role</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4 text-gray-500 font-mono">#{u.id}</td>
                                <td className="p-4 font-bold">{u.username} {u.id === currentUser?.id && <span className="ml-2 text-xs text-gray-500 bg-white/10 px-2 py-1 rounded">(You)</span>}</td>
                                <td className="p-4 text-gray-400 flex items-center gap-2"><Mail className="w-4 h-4" /> {u.email}</td>
                                <td className="p-4">
                                    {u.is_admin === 2 ? (
                                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-bold flex items-center gap-2 inline-flex">
                                            <Shield className="w-3 h-3" /> SUPERUSER
                                        </span>
                                    ) : u.is_admin === 1 ? (
                                        <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold flex items-center gap-2 inline-flex">
                                            <Shield className="w-3 h-3" /> ADMIN
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full text-xs font-bold inline-flex">
                                            USER
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    {u.id !== currentUser?.id && currentUser?.is_admin === 2 && (
                                        <button 
                                            onClick={() => handleToggleAdmin(u)} 
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${u.is_admin ? 'bg-gray-500/10 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border-transparent hover:border-red-500/30' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 hover:border-red-500/40'}`}
                                        >
                                            {u.is_admin ? <span className="flex items-center gap-1"><ShieldOff className="w-3 h-3" /> Revoke Admin</span> : <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Make Admin</span>}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
