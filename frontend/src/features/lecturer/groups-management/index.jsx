import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Eye, Star, Users, GraduationCap, Calendar, BookOpen, Clock, CheckCircle, AlertCircle, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { thesisTopicService } from '@/api/thesisTopicService';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// --- HELPER COMPONENTS ---

const getStatusConfig = (status) => {
    switch (status) {
      case 'Đang thực hiện':
        return { 
          color: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
          icon: Clock
        };
      case 'Đã hoàn thành':
        return { 
          color: 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
          icon: CheckCircle
        };
      case 'Không đạt':
        return { 
          color: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
          icon: AlertCircle
        };
      default:
        return { 
          color: 'text-gray-700 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
          icon: Users
        };
    }
};

const GroupCard = ({ group, onViewDetails }) => {
    const { nhom, detai, TRANGTHAI, NGAY_PHANCONG } = group;
    const statusConfig = getStatusConfig(TRANGTHAI);
    const StatusIcon = statusConfig.icon;

    // Sử dụng danh sách thành viên từ API
    const members = nhom?.thanhviens || nhom?.thanhvienNhom || [];

    return (
        <Card className="group relative flex flex-col overflow-hidden border-border/60 hover:border-primary/50 hover:shadow-md transition-all duration-300">
            {/* Header */}
            <CardHeader className="p-5 pb-3 bg-muted/5">
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold text-foreground truncate" title={nhom?.TEN_NHOM}>
                                {nhom?.TEN_NHOM || "Nhóm chưa đặt tên"}
                            </CardTitle>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">Nhóm số: {nhom?.ID_NHOM || 'N/A'}</p>
                    </div>
                    <Badge variant="outline" className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors", statusConfig.color)}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {TRANGTHAI}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-4 space-y-5 flex-1">
                {/* Đề tài */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Đề tài đang thực hiện
                    </h4>
                    <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                        <p className="text-sm font-medium text-foreground line-clamp-2" title={detai?.TEN_DETAI}>
                            {detai?.TEN_DETAI || "Chưa đăng ký đề tài"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     {/* Ngày phân công */}
                     <div className="flex items-start gap-3 text-sm">
                        <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0 mt-0.5">
                           <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày bắt đầu</p>
                            <p className="font-medium text-foreground break-words">
                                {NGAY_PHANCONG ? format(new Date(NGAY_PHANCONG), 'dd/MM/yyyy', { locale: vi }) : '---'}
                            </p>
                        </div>
                     </div>

                     {/* Thành viên - Click để mở Popover */}
                     <Popover>
                        <PopoverTrigger asChild>
                             <div className="flex items-start gap-3 text-sm cursor-pointer group/member hover:bg-muted/50 rounded-md -m-2 p-2 transition-colors">
                                <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0 mt-0.5 group-hover/member:bg-primary/10 group-hover/member:text-primary transition-colors">
                                   <Users className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide group-hover/member:text-primary">Thành viên</p>
                                    <p className="font-medium text-foreground break-words underline decoration-dotted underline-offset-4 decoration-muted-foreground/50">
                                        {members.length} sinh viên
                                    </p>
                                </div>
                             </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="end">
                            <div className="p-3 border-b bg-muted/30">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary"/> Danh sách thành viên
                                </h4>
                            </div>
                            <div className="p-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {members.length > 0 ? (
                                    <ul className="space-y-1">
                                        {members.map((mem, idx) => (
                                            <li key={mem.ID_NGUOIDUNG || idx} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                                    {mem.nguoidung?.HODEM_VA_TEN?.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium truncate">{mem.nguoidung?.HODEM_VA_TEN}</p>
                                                        {mem.ID_NGUOIDUNG === nhom.ID_NHOMTRUONG && (
                                                            <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-mono">{mem.nguoidung?.MA_DINHDANH}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Chưa có thành viên</p>
                                )}
                            </div>
                        </PopoverContent>
                     </Popover>
                </div>
            </CardContent>

            <CardFooter className="p-4 bg-muted/10 border-t flex gap-3">
                <Button 
                    variant="outline" 
                    className="flex-1 bg-background hover:bg-accent" 
                    onClick={() => onViewDetails(nhom?.ID_NHOM)}
                >
                    <Eye className="w-4 h-4 mr-2 text-muted-foreground" /> Chi tiết
                </Button>
                <Button 
                    variant="default" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    // Logic đánh giá nên chuyển hướng sang trang đánh giá hoặc mở modal
                    onClick={() => onViewDetails(nhom?.ID_NHOM)} 
                >
                    <Star className="w-4 h-4 mr-2" /> Đánh giá
                </Button>
            </CardFooter>
        </Card>
    );
};

// --- MAIN COMPONENT ---

const GroupsManagementPage = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      // API trả về Mảng trực tiếp, không phải object có key data
      const data = await thesisTopicService.getGroupsForLecturer();
      
      // Kiểm tra xem data có phải là mảng không trước khi set state
      if (Array.isArray(data)) {
          setGroups(data);
      } else if (data && Array.isArray(data.data)) {
          // Fallback phòng trường hợp API thay đổi trả về paginate
          setGroups(data.data);
      } else {
          setGroups([]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Không thể tải dữ liệu nhóm.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (nhomId) => {
    if (nhomId) {
        navigate(`/lecturer/groups-management/${nhomId}/details`);
    } else {
        toast.error("Không tìm thấy ID nhóm");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 bg-gray-50/50 dark:bg-background">
      <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-800">
                 <Users className="w-5 h-5 text-blue-600" />
                 <span className="font-semibold text-blue-800 dark:text-blue-300">{groups.length}</span>
                 <span className="text-blue-600/80 dark:text-blue-400 text-sm">nhóm đang hướng dẫn</span>
            </div>
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="flex flex-col justify-center items-center h-[60vh] text-muted-foreground">
              <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
              <p className="text-lg font-medium">Đang tải danh sách nhóm...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5">
              <div className="p-6 bg-muted rounded-full mb-4">
                 <GraduationCap className="h-16 w-16 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Chưa có nhóm nào</h3>
              <p className="text-muted-foreground mt-2 max-w-md text-center">
                Hiện tại bạn chưa được phân công hướng dẫn nhóm nào. Khi sinh viên đăng ký đề tài, danh sách sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {groups.map((group) => (
                    <GroupCard 
                        key={group.ID_PHANCONG} 
                        group={group} 
                        onViewDetails={handleViewDetails} 
                    />
                ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default GroupsManagementPage;