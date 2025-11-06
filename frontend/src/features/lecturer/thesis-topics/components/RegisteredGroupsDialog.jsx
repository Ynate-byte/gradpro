import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { thesisTopicService } from '@/api/thesisTopicService';
import { Users, Calendar, BookOpen, GraduationCap, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const InfoItem = ({ icon: Icon, label, value, children }) => (
  <div className="flex items-start">
    <Icon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
    <div className="ml-3 flex-1">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
        {value || children || (
          <span className="text-xs italic text-gray-400 dark:text-gray-500">Chưa có thông tin</span>
        )}
      </div>
    </div>
  </div>
);

const getStatusBadge = (status) => {
  const statusConfig = {
    'Đang thực hiện': { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700', label: 'Đang thực hiện' },
    'Đã hoàn thành': { className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700', label: 'Đã hoàn thành' },
    'Không đạt': { className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700', label: 'Không đạt' }
  };
  const config = statusConfig[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge variant="outline" className={cn('px-2 py-0.5 text-xs', config.className)}>{config.label}</Badge>;
};

const RegisteredGroupsDialog = ({ open, onOpenChange, topic }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && topic) {
      loadRegisteredGroups();
    }
  }, [open, topic]);

  const loadRegisteredGroups = async () => {
    try {
      setLoading(true);
      const response = await thesisTopicService.getRegisteredGroups({
        topic_id: topic.ID_DETAI
      });
      setGroups(response.data.data || []);
    } catch (error) {
      console.error('Error loading registered groups:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl w-full h-full max-h-[90vh] p-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 border-l-4 border-blue-500"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 pb-4 bg-white dark:bg-gray-800 border-b border-blue-200 dark:border-blue-700 shadow-sm flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100">
              <Users className="w-5 h-5 text-blue-500" />
              Nhóm đã đăng ký
            </DialogTitle>
            <DialogDescription className="line-clamp-2">
              Đề tài: {topic?.TEN_DETAI}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="space-y-4 p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-blue-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p>Đang tải danh sách nhóm...</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="font-semibold">Chưa có nhóm nào đăng ký</p>
                  <p className="text-sm">Đề tài này chưa được nhóm nào đăng ký.</p>
                </div>
              ) : (
                groups.map((assignment) => (
                  <Card key={assignment.ID_PHANCONG} className="border border-blue-200 dark:border-blue-700 shadow-md bg-white dark:bg-gray-800">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {assignment.nhom?.TEN_NHOM}
                          </CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Mã nhóm: {assignment.nhom?.MA_NHOM || 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(assignment.TRANGTHAI)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-4">
                        <InfoItem
                          icon={User}
                          label="Trưởng nhóm"
                          value={assignment.nhom?.nhomtruong?.HODEM_VA_TEN}
                        />
                        <InfoItem
                          icon={Calendar}
                          label="Ngày phân công"
                          value={format(new Date(assignment.NGAY_PHANCONG), 'dd/MM/yyyy', { locale: vi })}
                        />
                      </div>
                      <InfoItem icon={Users} label="Thành viên nhóm">
                        <div className="flex flex-wrap gap-2">
                          {assignment.nhom?.thanhvienNhom?.map((member, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            >
                              {member.nguoidung?.HODEM_VA_TEN}
                            </Badge>
                          )) || <span className="text-sm text-gray-500">Chưa có thành viên</span>}
                        </div>
                      </InfoItem>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegisteredGroupsDialog;