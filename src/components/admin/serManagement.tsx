"use client";
import { useState } from "react";
import { updateUserRole } from "@/app/_actions/admin";
import { Shield, User, Store, RefreshCw } from "lucide-react";

export default function UserManagement({ users }: { users: any[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleChangeRole = async (userId: string, newRole: any) => {
        setLoadingId(userId);
        try {
            await updateUserRole(userId, newRole);
            alert("Rol actualizado correctamente");
        } catch (error) {
            alert("Error al actualizar el rol");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-4 font-bold text-gray-600 text-sm">Usuario</th>
                        <th className="p-4 font-bold text-gray-600 text-sm">Rol Actual</th>
                        <th className="p-4 font-bold text-gray-600 text-sm">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <img src={user.imageUrl} className="w-8 h-8 rounded-full border" alt="" />
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{user.firstName} {user.lastName}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                        user.role === 'vendedor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="p-4">
                                <div className="flex gap-2">
                                    <button
                                        disabled={loadingId === user.id}
                                        onClick={() => handleChangeRole(user.id, "admin")}
                                        className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition title='Hacer Admin'"
                                    >
                                        <Shield size={18} />
                                    </button>
                                    <button
                                        disabled={loadingId === user.id}
                                        onClick={() => handleChangeRole(user.id, "vendedor")}
                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition title='Hacer Vendedor'"
                                    >
                                        <Store size={18} />
                                    </button>
                                    <button
                                        disabled={loadingId === user.id}
                                        onClick={() => handleChangeRole(user.id, "cliente")}
                                        className="p-2 hover:bg-gray-100 text-gray-400 rounded-lg transition title='Hacer Cliente'"
                                    >
                                        <User size={18} />
                                    </button>
                                    {loadingId === user.id && <RefreshCw size={18} className="animate-spin text-gray-400" />}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}