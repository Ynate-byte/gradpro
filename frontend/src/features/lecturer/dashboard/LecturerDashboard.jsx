import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getLecturerDashboardStats } from '@/api/lecturerService';
import { Loader2, Users, Calendar, LayoutDashboard, GraduationCap } from 'lucide-react';
import StatCard from '@/components/shared/StatCard'; // Import StatCard chung
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

export default function LecturerDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: stats, isLoading } = useQuery({
        queryKey: ['lecturerDashboardStats'],
        queryFn: getLecturerDashboardStats,
    });

    const name = user?.HODEM_VA_TEN || 'Giảng viên';
    
    return (
        <div className="p-4 md:p-8 space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-3xl font-bold">Chào mừng trở lại, {name}</h1>
                <p className="text-muted-foreground">Đây là tổng quan nhanh về các hoạt động của bạn.</p>
            </motion.div>

            <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Nhóm đang hướng dẫn"
                        value={isLoading ? 'loading' : stats?.nhomHuongDanCount ?? 0}
                        description="Các nhóm đang thực hiện KLTN"
                        icon={Users}
                        iconBgClass="bg-blue-100 dark:bg-blue-900/30"
                        iconColorClass="text-blue-600 dark:text-blue-400"
                        onClick={() => navigate('/lecturer/groups-management')}
                    />
                </motion.div>
                
                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Lịch họp sắp tới"
                        value={isLoading ? 'loading' : stats?.lichHopCount ?? 0}
                        description="Trong 7 ngày tới"
                        icon={Calendar}
                        iconBgClass="bg-green-100 dark:bg-green-900/30"
                        iconColorClass="text-green-600 dark:text-green-400"
                        onClick={() => navigate('/projects/my-group')} // (Tạm thời, sau này sẽ là trang lịch tổng)
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Công việc chờ Review"
                        value={isLoading ? 'loading' : stats?.taskReviewCount ?? 0}
                        description="Từ các nhóm của bạn"
                        icon={LayoutDashboard}
                        iconBgClass="bg-orange-100 dark:bg-orange-900/30"
                        iconColorClass="text-orange-600 dark:text-orange-400"
                        onClick={() => navigate('/lecturer/groups-management')} // (Tạm thời)
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <StatCard
                        title="Hội đồng tham gia"
                        value={isLoading ? 'loading' : stats?.hoiDongCount ?? 0}
                        description="Các hội đồng sắp diễn ra"
                        icon={GraduationCap}
                        iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
                        iconColorClass="text-indigo-600 dark:text-indigo-400"
                        onClick={() => navigate('/lecturer/council')}
                    />
                </motion.div>
            </motion.div>
            
            {/* TODO: Thêm các Widget khác ở đây (vd: Danh sách nhóm, Lịch biểu...) */}

        </div>
    );
}