import React from 'react';
import { GeneralInfoForm } from './components/GeneralInfoForm';
import { ChangePasswordForm } from './components/ChangePasswordForm';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export default function ProfilePage() {
    const { user } = useAuth();

    if (!user) return null;

    // Xác định Role Label
    let roleLabel = "Người dùng";
    let roleColor = "secondary";
    
    if (user.vaitro?.TEN_VAITRO === 'Admin') {
        roleLabel = "Quản trị viên";
        roleColor = "destructive";
    } else if (user.sinhvien) {
        roleLabel = "Sinh viên";
        roleColor = "default"; // Blue/Primary
    } else if (user.giangvien) {
        roleLabel = "Giảng viên";
        roleColor = "outline"; 
        
        // Nếu có chức vụ, hiển thị chức vụ cao nhất
        const positions = user.giangvien.chucvus;
        if (positions && positions.length > 0) {
            // Ưu tiên hiển thị Trưởng khoa/Trưởng bộ môn
            const vip = positions.find(p => p.MA_CHUCVU.includes('TRUONG'));
            roleLabel = vip ? vip.TEN_CHUCVU : positions[0].TEN_CHUCVU;
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header Profile */}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                    <AvatarImage src={user.AVATAR_URL} alt={user.HODEM_VA_TEN} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {getInitials(user.HODEM_VA_TEN)}
                    </AvatarFallback>
                </Avatar>
                <div className="text-center md:text-left space-y-2">
                    <h1 className="text-3xl font-bold">{user.HODEM_VA_TEN}</h1>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                        <span>{user.EMAIL}</span>
                        <span>•</span>
                        <Badge variant={roleColor} className="text-sm">{roleLabel}</Badge>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cột trái: Thông tin chung (Chiếm 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <GeneralInfoForm />
                </div>

                {/* Cột phải: Bảo mật (Chiếm 1/3) */}
                <div className="lg:col-span-1 space-y-6">
                    <ChangePasswordForm />
                </div>
            </div>
        </div>
    );
}