import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createGroup } from '@/api/groupService';
import { getChuyenNganhs, getKhoaBomons } from '@/api/userService'; // Giữ lại để tải options
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // <-- THÊM MỚI

// Schema (Không đổi)
const createGroupSchema = z.object({
  TEN_NHOM: z.string().min(5, { message: "Tên nhóm phải có ít nhất 5 ký tự." }).max(100),
  MOTA: z.string().max(255, { message: "Mô tả không được vượt quá 255 ký tự." }).optional(),
  ID_CHUYENNGANH: z.string().optional(),
  ID_KHOA_BOMON: z.string().optional(),
});

// Nâng cấp: Tải options bằng useQuery
const useFormOptions = () => {
  const { data: chuyenNganhs = [] } = useQuery({
    queryKey: ['chuyenNganhs'],
    queryFn: getChuyenNganhs,
    staleTime: Infinity, // Dữ liệu này hiếm khi thay đổi
  });
  const { data: khoaBomons = [] } = useQuery({
    queryKey: ['khoaBomons'],
    queryFn: getKhoaBomons,
    staleTime: Infinity,
  });
  return { chuyenNganhs, khoaBomons };
};

export function CreateGroupDialog({ isOpen, setIsOpen, planId }) { // <-- Bỏ `onSuccess`
  const { chuyenNganhs, khoaBomons } = useFormOptions();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { TEN_NHOM: '', MOTA: '', ID_CHUYENNGANH: '', ID_KHOA_BOMON: '' },
  });

  // Reset form khi mở dialog
  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  // Nâng cấp: Sử dụng useMutation để tạo nhóm
  const createGroupMutation = useMutation({
    mutationFn: (data) => createGroup(data, planId),
    onSuccess: () => {
      toast.success("Tạo nhóm thành công!");
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] }); // Tự động refresh
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Tạo nhóm thất bại.");
    }
  });

  const onSubmit = (data) => {
    createGroupMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tạo nhóm mới</DialogTitle>
          <DialogDescription>
            Nhập tên và các thông tin để thành lập nhóm của bạn. Bạn sẽ là nhóm trưởng.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* ... (FormField TEN_NHOM, MOTA - không đổi) ... */}
            <FormField
              control={form.control}
              name="TEN_NHOM"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên nhóm *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Nhóm chiến binh bất bại" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="MOTA"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú / Mô tả (Tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Mô tả ngắn về mục tiêu hoặc định hướng của nhóm..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Cập nhật Select với dữ liệu từ useQuery */}
            <FormField
              control={form.control}
              name="ID_CHUYENNGANH"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ưu tiên Chuyên ngành (Tùy chọn)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chuyên ngành" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {chuyenNganhs.map(cn =>
                        <SelectItem key={cn.ID_CHUYENNGANH} value={String(cn.ID_CHUYENNGANH)}>
                          {cn.TEN_CHUYENNGANH}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ID_KHOA_BOMON"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ưu tiên Khoa/Bộ môn (Tùy chọn)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn khoa hoặc bộ môn" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {khoaBomons.map(kb =>
                        <SelectItem key={kb.ID_KHOA_BOMON} value={String(kb.ID_KHOA_BOMON)}>
                          {kb.TEN_KHOA_BOMON}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              {/* Cập nhật trạng thái disabled */}
              <Button type="submit" disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo nhóm
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}