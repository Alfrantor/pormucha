"use client";

import { useFormStatus } from "react-dom";

export function TogglePlanBtn({ isActive }: { isActive: boolean }) {
    const { pending } = useFormStatus();
    
    return (
        <button 
            type="submit"
            disabled={pending}
            onClick={(e) => {
                if (isActive) {
                    if (!window.confirm("¿Seguro que deseas desactivar este plan? Ya no aparecerá en el catálogo público.")) {
                        e.preventDefault();
                    }
                } else {
                    if (!window.confirm("¿Volver a activar este plan y agregarlo al catálogo público?")) {
                        e.preventDefault();
                    }
                }
            }}
            title={isActive ? "Desactivar Plan" : "Activar Plan"}
            className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform hover:scale-110 disabled:opacity-50 ${
                isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            }`}
        >
            {pending ? "..." : isActive ? "✕" : "✔"}
        </button>
    );
}
