import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyGradingTasks, submitZeroPhanBien } from "@/api/chamDiemService";
import { Loader2, PenSquare, BookUser, MessageSquare, Users, GraduationCap, XCircle, AlertTriangle, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradingModal } from "./GradingModal";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// --- Animation Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100, damping: 15 }
    }
};

// --- Helper Functions ---

const getStatusBadge = (status) => {
    const statusConfig = {
        'Đang thực hiện': { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Đang thực hiện' },
        'Đã hoàn thành': { className: 'bg-green-100 text-green-700 border-green-200', label: 'Đã hoàn thành' },
        'Không đạt': { className: 'bg-red-100 text-red-700 border-red-200', label: 'Không đạt' }
    };
    const config = statusConfig[status] || { className: 'bg-gray-100 text-gray-700 border-gray-200', label: status };
    return <Badge variant="outline" className={cn('px-2 py-0.5 text-xs font-medium', config.className)}>{config.label}</Badge>;
};

/**
 * Kiểm tra xem việc chấm điểm có được phép hay không
 * Dựa trên trạng thái kế hoạch: Chỉ cho phép khi "Đang thực hiện" hoặc "Đang chấm điểm"
 */
const isGradingAllowed = (nhom) => {
    const status = nhom.kehoach?.TRANGTHAI;
    // Danh sách các trạng thái cho phép chấm điểm
    const allowedStatuses = ['Đang thực hiện', 'Đang chấm điểm'];
    return allowedStatuses.includes(status);
};

// --- Sub-component: GradingTable ---

const GradingTable = ({ data, onGradeClick, role, queryClient }) => {
    
    const handleRejectClick = async (nhom, e) => {
        e.stopPropagation();
        if (!window.confirm(`Xác nhận Ghi nhận 0 điểm Phản biện cho nhóm "${nhom.TEN_NHOM}"? Thao tác này sẽ ghi đè điểm cũ và KHÔNG THỂ HOÀN TÁC.`)) return;
        
        try {
            await submitZeroPhanBien(nhom.ID_NHOM);
            toast.success(`Đã ghi nhận 0 điểm Phản biện cho nhóm "${nhom.TEN_NHOM}".`);
            queryClient.invalidateQueries({ queryKey: ["myGradingTasks"] });
        } catch (error) {
            toast.error(error.response?.data?.error || "Ghi nhận 0 điểm thất bại.");
        }
    };
    
    if (!data || data.length === 0) {
        return (
            <div className="text-center text-muted-foreground p-8 flex flex-col items-center justify-center min-h-[200px]">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="font-semibold text-lg">Không có nhóm nào</p>
                <p className="text-sm mt-1">Bạn không có nhóm nào cần chấm ở mục này.</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="font-semibold w-[250px]">Tên Nhóm</TableHead>
                    <TableHead className="font-semibold">Đề Tài</TableHead>
                    <TableHead className="font-semibold w-[120px]">Trạng Thái</TableHead>
                    <TableHead className="font-semibold text-center w-[100px]">Điểm</TableHead>
                    <TableHead className="text-right font-semibold w-[180px]">Thao tác</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((nhom) => {
                    // Lấy điểm hiện tại dựa trên role
                    const attributeName = `diem_${role}_hientai`;
                    const currentScore = nhom[attributeName];
                    const displayScore = (currentScore === null || currentScore === undefined) ? '-' : parseFloat(currentScore).toFixed(2);
                    
                    // Kiểm tra khóa chấm
                    const canGrade = isGradingAllowed(nhom);

                    return (
                        <TableRow key={nhom.ID_NHOM} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">
                                {nhom.TEN_NHOM}
                                <div className="text-xs text-muted-foreground mt-1">{nhom.kehoach?.TEN_DOT}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate" title={nhom.detai?.TEN_DETAI || nhom.phancong_detai_nhom?.detai?.TEN_DETAI}>
                                {nhom.detai?.TEN_DETAI || nhom.phancong_detai_nhom?.detai?.TEN_DETAI || "Chưa có đề tài"}
                            </TableCell>
                            <TableCell>{getStatusBadge(nhom.TRANGTHAI)}</TableCell>
                            <TableCell className="font-bold text-lg text-center text-primary">
                                {displayScore}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {/* Nút 0 điểm cho Phản biện */}
                                    {role === 'phanbien' && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={!canGrade}
                                            onClick={(e) => handleRejectClick(nhom, e)}
                                            className="h-8 px-2"
                                            title={!canGrade ? "Đợt chấm đã đóng" : "Không chấp thuận (0 điểm)"}
                                        >
                                            <XCircle className="mr-1 h-4 w-4" /> 0đ
                                        </Button>
                                    )}
                                    
                                    {/* Nút Chấm điểm */}
                                    <Button
                                        variant="default"
                                        size="sm"
                                        disabled={!canGrade}
                                        onClick={() => onGradeClick(nhom, role)}
                                        className={cn(
                                            "h-8 px-3 font-medium text-white",
                                            canGrade ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
                                        )}
                                    >
                                        {canGrade ? <PenSquare className="mr-2 h-3.5 w-3.5" /> : <Lock className="mr-2 h-3.5 w-3.5" />}
                                        {canGrade ? "Chấm" : "Khóa"}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};

// --- Main Component ---

const LecturerGradingPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [selectedRole, setSelectedRole] = useState("");
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["myGradingTasks"],
        queryFn: getMyGradingTasks,
    });

    const handleGradeClick = (nhom, role) => {
        setSelectedGroup(nhom);
        setSelectedRole(role);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedGroup(null);
        setSelectedRole("");
    };

    const handleSaveSuccess = () => {
        handleModalClose();
        queryClient.invalidateQueries({ queryKey: ["myGradingTasks"] });
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full min-h-[60vh]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Loader2 className="h-12 w-12 text-blue-500" />
                </motion.div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                    <p className="text-lg font-semibold text-red-600">Lỗi khi tải dữ liệu</p>
                    <p className="text-sm text-muted-foreground mt-1">Vui lòng thử lại sau.</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="h-full overflow-y-auto space-y-6 p-4 md:p-8 bg-gray-50/50 dark:bg-background"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        >
            <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
                <Tabs defaultValue="huongdan" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 border rounded-lg mb-6">
                        <TabsTrigger value="huongdan" className="py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all font-medium">
                            <BookUser className="mr-2 h-4 w-4" /> Hướng Dẫn ({data.huongdan?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="phanbien" className="py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all font-medium">
                            <MessageSquare className="mr-2 h-4 w-4" /> Phản Biện ({data.phanbien?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="hoidong" className="py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all font-medium">
                            <Users className="mr-2 h-4 w-4" /> Hội Đồng ({data.hoidong?.length || 0})
                        </TabsTrigger>
                    </TabsList>

                    <Card className="border shadow-md bg-card">
                        <CardContent className="p-0">
                            <TabsContent value="huongdan" className="m-0">
                                <GradingTable data={data.huongdan} onGradeClick={handleGradeClick} role="huongdan" queryClient={queryClient} />
                            </TabsContent>
                            <TabsContent value="phanbien" className="m-0">
                                <GradingTable data={data.phanbien} onGradeClick={handleGradeClick} role="phanbien" queryClient={queryClient} />
                            </TabsContent>
                            <TabsContent value="hoidong" className="m-0">
                                <GradingTable data={data.hoidong} onGradeClick={handleGradeClick} role="hoidong" queryClient={queryClient} />
                            </TabsContent>
                        </CardContent>
                    </Card>
                </Tabs>
            </motion.div>

            {selectedGroup && (
                <GradingModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    onSaveSuccess={handleSaveSuccess}
                    group={selectedGroup}
                    role={selectedRole}
                />
            )}
        </motion.div>
    );
};

export default LecturerGradingPage;