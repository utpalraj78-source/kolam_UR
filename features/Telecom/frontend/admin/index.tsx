
import React, { useState, useEffect } from 'react';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

const TelecomAdmin = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('telecom_admin_token'));

    const handleLoginSuccess = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('telecom_admin_token', newToken);
    };

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('telecom_admin_token');
    };

    if (!token) {
        return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="relative">
            <button
                onClick={handleLogout}
                className="fixed top-4 right-4 z-[100] bg-white/5 hover:bg-white/10 text-white/50 hover:text-white px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border border-white/10 transition-all font-mono"
            >
                Terminate Session [ESC]
            </button>
            <AdminDashboard />
        </div>
    );
};

export default TelecomAdmin;
