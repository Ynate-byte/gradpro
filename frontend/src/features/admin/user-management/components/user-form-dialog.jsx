import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from "sonner";
import { userFormSchema } from './user-form-schema';
import { createUser, updateUser, getRoles, getChuyenNganhs, getKhoaBomons } from '@/api/userService';
import { User, Mail, Hash, KeyRound, Briefcase, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Hiển thị form tạo hoặc chỉnh sửa thông tin người dùng
export function UserFormDialog({ isOpen, setIsOpen, editingUser, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [auxData, setAuxData] = useState({ roles: [], chuyenNganhs: [], khoaBomons: [] });
  const isEditMode = !!editingUser;
  const form = useForm({
    resolver: zodResolver(userFormSchema),
    mode: 'onChange',
    defaultValues: {
      HODEM_VA_TEN: '',
      EMAIL: '',
      MA_DINHDANH: '',
      ID_VAITRO: '',
      password: '',
      TRANGTHAI_KICHHOAT: true,
      sinhvien_details: { ID_CHUYENNGANH: '', NIENKHOA: 'K13', HEDAOTAO: 'Cử nhân', TEN_LOP: '' },
      giangvien_details: { ID_KHOA_BOMON: '', HOCVI: 'Thạc sĩ', CHUCVU: null },
    },
  });
  const watchedRole = form.watch("ID_VAITRO");

  // Tải danh sách vai trò, chuyên ngành, khoa/bộ môn
  useEffect(() => {
    if (isOpen) {
      Promise.all([
        getRoles().catch(() => []),
        getChuyenNganhs().catch(() => []),
        getKhoaBomons().catch(() => [])
      ]).then(([roles, chuyenNganhs, khoaBomons]) => {
        setAuxData({ roles, chuyenNganhs, khoaBomons });
      });
    }
  }, [isOpen]);

  // Cập nhật form khi chỉnh sửa hoặc tạo mới
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && editingUser) {
        form.reset({
          HODEM_VA_TEN: editingUser.HODEM_VA_TEN || '',
          EMAIL: editingUser.EMAIL || '',
          MA_DINHDANH: editingUser.MA_DINHDANH || '',
          ID_VAITRO: String(editingUser.ID_VAITRO || ''),
          TRANGTHAI_KICHHOAT: editingUser.TRANGTHAI_KICHHOAT,
          sinhvien_details: editingUser.sinhvien || { ID_CHUYENNGANH: '', NIENKHOA: '', HEDAOTAO: '', TEN_LOP: '' },
          giangvien_details: editingUser.giangvien || { ID_KHOA_BOMON: '', HOCVI: '', CHUCVU: null },
          password: '',
        });
      } else {
        form.reset({
          HODEM_VA_TEN: '',
          EMAIL: '',
          MA_DINHDANH: '',
          ID_VAITRO: '',
          password: '',
          TRANGTHAI_KICHHOAT: true,
          sinhvien_details: { ID_CHUYENNGANH: '', NIENKHOA: 'K13', HEDAOTAO: 'Cử nhân', TEN_LOP: '' },
          giangvien_details: { ID_KHOA_BOMON: '', HOCVI: 'Thạc sĩ', CHUCVU: null },
        });
      }
    }
  }, [isOpen, editingUser, isEditMode, form]);

  // Gửi dữ liệu form để tạo hoặc cập nhật người dùng
  async function onSubmit(data) {
    setIsLoading(true);
    try {
      if (isEditMode) {
        await updateUser(editingUser.ID_NGUOIDUNG, data);
        toast.success("Cập nhật người dùng thành công!");
      } else {
        await createUser(data);
        toast.success("Tạo người dùng mới thành công!");
      }
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(error.response?.data?.message || "Đã có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Chỉnh sửa Người dùng' : 'Thêm Người dùng mới'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Cập nhật thông tin chi tiết cho người dùng.' : 'Điền đầy đủ thông tin để tạo tài khoản mới.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow min-h-0 flex flex-col">
            <ScrollArea className="flex-grow pr-6 -mr-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Thông tin cơ bản</h3>
                  <Separator className="mt-2" />
                  <div className="space-y-4 pt-4">
                    <FormField
                      name="HODEM_VA_TEN"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Họ và tên</FormLabel>
                          <FormControl>
                            <Input placeholder="Nguyễn Văn A" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        name="EMAIL"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="example@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name="MA_DINHDANH"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mã định danh (MSSV/MSGV)</FormLabel>
                            <FormControl>
                              <Input placeholder="200120..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {!isEditMode && (
                      <FormField
                        name="password"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mật khẩu</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormDescription>Để trống để dùng mật khẩu mặc định (123456).</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Phân quyền & Chi tiết</h3>
                  <Separator className="mt-2" />
                  <div className="space-y-4 pt-4">
                    <FormField
                      name="ID_VAITRO"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vai trò</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isEditMode}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn vai trò cho người dùng" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {auxData.roles.map(role => (
                                <SelectItem key={role.ID_VAITRO} value={String(role.ID_VAITRO)}>
                                  {role.TEN_VAITRO}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isEditMode && <FormDescription>Vai trò không thể thay đổi sau khi tạo.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {watchedRole === "3" && (
                      <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          Thông tin Sinh viên
                        </h4>
                        <FormField
                          name="sinhvien_details.ID_CHUYENNGANH"
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chuyên ngành</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={String(field.value)}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn chuyên ngành" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {auxData.chuyenNganhs.map(cn => (
                                    <SelectItem key={cn.ID_CHUYENNGANH} value={String(cn.ID_CHUYENNGANH)}>
                                      {cn.TEN_CHUYENNGANH}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            name="sinhvien_details.TEN_LOP"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tên lớp</FormLabel>
                                <FormControl>
                                  <Input placeholder="DH20IT01" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="sinhvien_details.NIENKHOA"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Niên khóa</FormLabel>
                                <FormControl>
                                  <Input placeholder="K13" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="sinhvien_details.HEDAOTAO"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hệ đào tạo</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Cử nhân">Cử nhân</SelectItem>
                                    <SelectItem value="Kỹ sư">Kỹ sư</SelectItem>
                                    <SelectItem value="Thạc sỹ">Thạc sỹ</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                    {watchedRole === "2" && (
                      <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Briefcase className="h-5 w-5 text-primary" />
                          Thông tin Giảng viên
                        </h4>
                        <FormField
                          name="giangvien_details.ID_KHOA_BOMON"
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Khoa/Bộ môn</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={String(field.value)}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn Khoa/Bộ môn" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {auxData.khoaBomons.map(kb => (
                                    <SelectItem key={kb.ID_KHOA_BOMON} value={String(kb.ID_KHOA_BOMON)}>
                                      {kb.TEN_KHOA_BOMON}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            name="giangvien_details.HOCVI"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Học vị</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Thạc sĩ">Thạc sĩ</SelectItem>
                                    <SelectItem value="Tiến sĩ">Tiến sĩ</SelectItem>
                                    <SelectItem value="Phó Giáo sư">Phó Giáo sư</SelectItem>
                                    <SelectItem value="Giáo sư">Giáo sư</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="giangvien_details.CHUCVU"
                            control={form.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Chức vụ (Tùy chọn)</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                                  value={field.value || "none"}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Chọn chức vụ" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">Không có</SelectItem>
                                    <SelectItem value="Trưởng khoa">Trưởng khoa</SelectItem>
                                    <SelectItem value="Phó khoa">Phó khoa</SelectItem>
                                    <SelectItem value="Giáo vụ">Giáo vụ</SelectItem>
                                    <SelectItem value="Trưởng bộ môn">Trưởng bộ môn</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {isEditMode && (
                  <FormField
                    name="TRANGTHAI_KICHHOAT"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-6">
                        <div className="space-y-0.5">
                          <FormLabel>Kích hoạt tài khoản</FormLabel>
                          <FormDescription>Nếu tắt, người dùng sẽ không thể đăng nhập.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6 border-t mt-auto shrink-0">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Lưu thay đổi' : 'Tạo người dùng'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}