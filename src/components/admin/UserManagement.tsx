"use client";

import React from "react";

export default function UserManagement({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="p-10 border-2 border-dashed rounded-3xl text-center text-gray-400">
                No hay usuarios registrados en Clerk todavía.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-50 text-[10px] uppercase font-black text-gray-500 border-b">
                        <th className="px-6 py-4">Usuario</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Rol en Sistema</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {data.map((user: any) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3">
                                {user.imageUrl ? (
                                    <img src={user.imageUrl} alt="avatar" className="w-8 h-8 rounded-full border" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                                        {user.firstName?.charAt(0) || "U"}
                                    </div>
                                )}
                                <span className="font-bold text-gray-900">
                                    {user.firstName} {user.lastName}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs font-medium text-blue-600">{user.email}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase border ${user.role === "admin"
                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                        : "bg-gray-50 text-gray-600 border-gray-200"
                                    }`}>
                                    {user.role || "Cliente"}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}