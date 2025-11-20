import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { autoGroupStudents } from '@/api/adminGroupService';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from 'lucide-react';

export function AutoGroupDialog({ isOpen, setIsOpen, onSuccess, planId, maxAllowed = 3 }) {
	const [isLoading, setIsLoading] = React.useState(false);

	// Tạo schema động dựa trên maxAllowed
	const autoGroupSchema = useMemo(() => z.object({
		desiredMembers: z.preprocess(
			(val) => Number(val),
			z.number()
				.min(2, "Số thành viên phải lớn hơn 1")
				.max(maxAllowed, `Số thành viên không được vượt quá quy định của kế hoạch (${maxAllowed} người)`)
		),
		priority: z.string().min(1, "Vui lòng chọn tiêu chí ưu tiên."),
	}), [maxAllowed]);

	const form = useForm({
		resolver: zodResolver(autoGroupSchema),
		defaultValues: { 
			desiredMembers: maxAllowed, // Mặc định là số tối đa
			priority: 'chuyennganh' 
		},
	});

	// Reset form mỗi khi mở dialog hoặc maxAllowed thay đổi
	useEffect(() => {
		if (isOpen) {
			form.reset({
				desiredMembers: maxAllowed,
				priority: 'chuyennganh'
			});
		}
	}, [isOpen, maxAllowed, form]);

	const onSubmit = async (data) => {
		setIsLoading(true);
		try {
			const payload = { ...data, plan_id: planId };
			const result = await autoGroupStudents(payload);
			toast.success(result.message, {
				description: `Đã tạo ${result.newGroupsCreated} nhóm mới.`,
			});
			onSuccess();
			setIsOpen(false);
		} catch (error) {
			toast.error(error.response?.data?.message || "Ghép nhóm thất bại.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Ghép nhóm tự động</DialogTitle>
					<DialogDescription>
						Hệ thống sẽ tự động sắp xếp các sinh viên chưa có nhóm vào các nhóm mới.
					</DialogDescription>
				</DialogHeader>

				<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-3 text-sm text-yellow-800 mb-2">
					<AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
					<div>
						<strong>Lưu ý:</strong> Kế hoạch này quy định tối đa <strong>{maxAllowed}</strong> thành viên/nhóm.
						Bạn không thể nhập số lượng lớn hơn.
					</div>
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
						<FormField control={form.control} name="desiredMembers" render={({ field }) => (
							<FormItem>
								<FormLabel>Số thành viên mong muốn mỗi nhóm</FormLabel>
								<FormControl>
									<Input 
										type="number" 
										min={2} 
										max={maxAllowed} 
										{...field} 
									/>
								</FormControl>
								<FormDescription>
									Mặc định hệ thống chọn số lượng tối đa cho phép.
								</FormDescription>
								<FormMessage />
							</FormItem>
						)} />
						
						<FormField control={form.control} name="priority" render={({ field }) => (
							<FormItem>
								<FormLabel>Ưu tiên ghép theo</FormLabel>
								<Select onValueChange={field.onChange} defaultValue={field.value}>
									<FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
									<SelectContent>
										<SelectItem value="chuyennganh">Cùng chuyên ngành</SelectItem>
										<SelectItem value="lop" disabled>Cùng lớp (sắp có)</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)} />

						<DialogFooter className="gap-2">
							<Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
							<Button type="submit" disabled={isLoading}>
								{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Thực hiện ghép
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}