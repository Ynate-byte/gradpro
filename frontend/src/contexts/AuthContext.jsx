import React, { createContext, useState, useContext, useEffect } from 'react';
import axiosClient from '@/api/axiosConfig';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, [token]);

    const login = (userData, userToken, remember) => {
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(userData));
        storage.setItem('authToken', userToken);
        setUser(userData);
        setToken(userToken);
        navigate('/');
    };

    const logout = async () => {
        try {
            await axiosClient.post('/logout');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('user');
            setUser(null);
            setToken(null);
            navigate('/login');
        }
    };

    const value = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};