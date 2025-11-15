import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyGradingTasks, submitZeroPhanBien } from "@/api/chamDiemService";
import { Loader2, PenSquare, BookUser, MessageSquare, Users, GraduationCap, XCircle, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
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

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
};

const getStatusBadge = (status) => {
    const statusConfig = {
        'Đang thực hiện': { 
            className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700', 
            label: 'Đang thực hiện' 
        },
        'Đã hoàn thành': { 
            className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700', 
            label: 'Đã hoàn thành' 
        },
        'Không đạt': { 
            className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700', 
            label: 'Không đạt' 
        }
    };
    const config = statusConfig[status] || { 
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700', 
        label: status 
    };
    return (
        <Badge 
            variant="outline" 
            className={cn('px-2 py-0.5 text-xs font-medium', config.className)}
        >
            {config.label}
        </Badge>
    );
};

// [SỬA ĐỔI] Thêm cột Điểm và logic Reject
const GradingTable = ({ data, onGradeClick, role, queryClient }) => { 
    
    // [Hàm xử lý Reject]
    const handleRejectClick = async (nhom, e) => {
        e.stopPropagation(); 
        if (!window.confirm(`Xác nhận Ghi nhận 0 điểm Phản biện cho nhóm "${nhom.TEN_NHOM}"? Thao tác này sẽ ghi đè điểm cũ và KHÔNG THỂ HOÀN TÁC.`)) return;
        
        const idNhom = nhom.ID_NHOM;

        try {
            await submitZeroPhanBien(idNhom);
            toast.success(`Đã ghi nhận 0 điểm Phản biện cho nhóm "${nhom.TEN_NHOM}".`);
            queryClient.invalidateQueries({ queryKey: ["myGradingTasks"] }); // Tải lại danh sách
        } catch (error) {
            toast.error(error.response?.data?.error || "Ghi nhận 0 điểm thất bại.");
        }
    };
    
    if (!data || data.length === 0) { 
        return (
            <div className="text-center text-muted-foreground p-8 flex flex-col items-center justify-center min-h-[200px]">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="font-semibold text-lg">Không có nhóm nào</p>
                <p className="text-sm mt-1">Bạn không có nhóm nào cần chấm ở mục này.</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="font-semibold">Tên Nhóm</TableHead>
                    <TableHead className="font-semibold">Đề Tài</TableHead>
                    <TableHead className="font-semibold">Trạng Thái</TableHead>
                    {/* [CỘT MỚI] Điểm hiện tại */}
                    <TableHead className="font-semibold text-center">Điểm</TableHead> 
                    <TableHead className="text-right font-semibold">Thao tác</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((nhom) => {
                    
                    // Lấy điểm hiện tại (diem_phanbien_hientai, diem_huongdan_hientai, etc.)
                    const attributeName = `diem_${role}_hientai`;
                    const currentScore = nhom[attributeName]; 

                    const displayScore = currentScore === null || currentScore === undefined
                                           ? '-'
                                           : parseFloat(currentScore).toFixed(2);

                    return (
                        <TableRow key={nhom.ID_NHOM} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">{nhom.TEN_NHOM}</TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
                                {nhom.detai?.TEN_DETAI ||
                                    nhom.phancong_detai_nhom?.detai?.TEN_DETAI ||
                                    "Chưa có đề tài"}
                            </TableCell>
                            <TableCell>{getStatusBadge(nhom.TRANGTHAI)}</TableCell>
                            
                            {/* [CỘT MỚI] Điểm hiện tại */}
                            <TableCell className="font-bold text-lg text-center text-primary">
                                {displayScore}
                            </TableCell>

                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    {/* [NÚT KHÔNG CHẤP THUẬN] Chỉ hiện cho vai trò Phản biện */}
                                    {role === 'phanbien' && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={(e) => handleRejectClick(nhom, e)}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" /> 0 điểm
                                        </Button>
                                    )}
                                    
                                    {/* Nút Chấm điểm mở Modal */}
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium"
                                        onClick={() => onGradeClick(nhom, role)}
                                    >
                                        <PenSquare className="mr-2 h-4 w-4" /> 
                                        Chấm điểm
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
            <div className="flex-1 flex items-center justify-center h-full p-8">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Loader2 className="h-12 w-12 text-blue-500" />
                </motion.div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
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
            className="flex-1 space-y-6 p-4 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.h1 
                    variants={itemVariants} 
                    className="text-3xl font-bold text-gray-900 dark:text-white"
                >
                    Chấm điểm Khóa luận
                </motion.h1>
                <motion.p 
                    variants={itemVariants} 
                    className="text-muted-foreground mt-1"
                >
                    Đây là danh sách các nhóm bạn được phân công chấm điểm.
                </motion.p>
            </motion.div>

            <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
            >
                <Tabs defaultValue="huongdan" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 dark:bg-card/50 border rounded-lg mb-4">
                        <TabsTrigger
                            value="huongdan"
                            className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-md transition-all font-medium"
                        >
                            <BookUser className="mr-2 h-4 w-4" />
                            Hướng Dẫn ({data.huongdan?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="phanbien"
                            className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-md transition-all font-medium"
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Phản Biện ({data.phanbien?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="hoidong"
                            className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-md transition-all font-medium"
                        >
                            <Users className="mr-2 h-4 w-4" />
                            Hội Đồng ({data.hoidong?.length || 0})
                        </TabsTrigger>
                    </TabsList>

                    <Card className="border border-blue-200 dark:border-blue-700/50 shadow-lg bg-card">
                        <CardContent className="p-0">
                            <TabsContent value="huongdan" className="m-0">
                                <GradingTable data={data.huongdan} onGradeClick={handleGradeClick} role="huongdan" queryClient={queryClient} />
                            </TabsContent>
                            <TabsContent value="phanbien" className="m-0">
                                {/* Truyền queryClient xuống GradingTable */}
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