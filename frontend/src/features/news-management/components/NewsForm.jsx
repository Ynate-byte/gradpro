import React, { useState, useEffect, useRef } from "react";
import axios from "../../../api/axiosConfig";
import { ShieldAlert, Loader2, Upload, X, Pin, Users, Save, XCircle } from "lucide-react";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import RichTextEditor from "@/components/ui/RichTextEditor"; 

const TARGET_ROLES = [
    { id: 'ALL', label: 'Tất cả mọi người' },
    { id: 'SINH_VIEN', label: 'Sinh viên' },
    { id: 'GIANG_VIEN', label: 'Giảng viên' },
];

const NewsForm = ({ news, onSuccess, onCancel }) => {
    const [form, setForm] = useState({
        title: "",
        category: "",
        content: "", 
        is_pinned: false,
        target_roles: ['ALL'], 
        pdf_file: null,
        cover_image: null,
        cover_preview: null,
    });
    const [fileName, setFileName] = useState("");
    const [loading, setLoading] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(false); // [NEW] State loading khi fetch dữ liệu cũ
    const [errorMessage, setErrorMessage] = useState("");
    
    const pdfInputRef = useRef(null);
    const coverInputRef = useRef(null);

    // [FIXED] Logic load dữ liệu: Nếu có ID, gọi API lấy chi tiết
    useEffect(() => {
        const loadNewsData = async () => {
            if (news?.id) {
                setIsFetchingData(true);
                try {
                    // Gọi API lấy dữ liệu mới nhất từ server
                    const res = await axios.get(`/news/${news.id}`);
                    const data = res.data;

                    // Parse target_roles
                    let roles = ['ALL'];
                    if (data.target_roles) {
                         try { 
                             roles = typeof data.target_roles === 'string' ? JSON.parse(data.target_roles) : data.target_roles; 
                         } catch(e) { console.error("Parse roles error", e); }
                    }

                    setForm({
                        title: data.title || "",
                        category: data.category || "",
                        content: data.content || "",
                        is_pinned: data.is_pinned === 1 || data.is_pinned === true, // Xử lý cả boolean và int (1/0)
                        target_roles: roles,
                        pdf_file: null,
                        cover_image: null,
                        cover_preview: data.cover_image_url || null,
                    });
                    setFileName(data.pdf_url ? data.pdf_url.split("/").pop() : "");
                } catch (error) {
                    console.error("Failed to fetch news details:", error);
                    toast.error("Không thể tải thông tin bài viết.");
                    onCancel(); // Quay lại nếu lỗi
                } finally {
                    setIsFetchingData(false);
                }
            } else {
                // Reset form nếu là tạo mới
                setForm({
                    title: "",
                    category: "",
                    content: "",
                    is_pinned: false,
                    target_roles: ['ALL'],
                    pdf_file: null,
                    cover_image: null,
                    cover_preview: null,
                });
                setFileName("");
            }
        };

        loadNewsData();
    }, [news?.id]); // Chỉ chạy lại khi ID thay đổi

    const handlePdfChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === "application/pdf") {
            setForm(prev => ({ ...prev, pdf_file: file }));
            setFileName(file.name);
        } else {
            toast.error("Chỉ chấp nhận file PDF!");
        }
    };

    const handleCoverImageChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, cover_image: file, cover_preview: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTargetRoleChange = (roleId, checked) => {
        setForm(prev => {
            let newRoles = [...prev.target_roles];
            if (roleId === 'ALL') {
                return { ...prev, target_roles: checked ? ['ALL'] : [] };
            } else {
                newRoles = newRoles.filter(r => r !== 'ALL');
                if (checked) newRoles.push(roleId);
                else newRoles = newRoles.filter(r => r !== roleId);
                
                if (newRoles.length === 0) newRoles = ['ALL'];
                
                return { ...prev, target_roles: newRoles };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error("Vui lòng nhập tiêu đề!");
        if (!form.content.trim() || form.content === '<p></p>') return toast.error("Vui lòng nhập nội dung!");

        setLoading(true);
        const formData = new FormData();
        formData.append("title", form.title);
        formData.append("category", form.category);
        formData.append("content", form.content);
        formData.append("is_pinned", form.is_pinned ? "1" : "0");
        formData.append("target_roles", JSON.stringify(form.target_roles));

        if (form.pdf_file) formData.append("pdf_file", form.pdf_file);
        if (form.cover_image) formData.append("cover_image", form.cover_image);
        
        // Logic xóa ảnh/pdf cũ (Kiểm tra dựa trên dữ liệu form hiện tại vs dữ liệu ban đầu nếu cần, 
        // nhưng đơn giản nhất là gửi cờ nếu người dùng đã xóa trên UI)
        if (news?.id) {
             // Nếu đang sửa, và trên UI không còn preview ảnh bìa (người dùng đã xóa), nhưng DB (news) lại có -> Gửi cờ xóa
             // Lưu ý: news ở đây là props truyền vào, có thể thiếu dữ liệu nếu không fetch lại. 
             // Nhưng logic xóa ảnh bìa thường dựa vào hành động người dùng bấm nút "Xóa ảnh".
             // Ở đây ta tạm thời dựa vào form state:
             if (!form.cover_preview && news.cover_image_url) { 
                 formData.append("remove_cover_image", "1"); 
             }
             if (!fileName && news.pdf_url) {
                 formData.append("remove_pdf", "1");
             }
        }

        if (news?.id) formData.append("_method", "POST");

        try {
            const url = news?.id ? `/news/${news.id}` : "/news";
            await axios.post(url, formData, { headers: { "Content-Type": "multipart/form-data" } });
            toast.success(news?.id ? "Cập nhật thành công!" : "Đăng tin thành công!");
            onSuccess?.();
        } catch (err) {
            console.error(err);
            setErrorMessage(err.response?.data?.message || "Có lỗi xảy ra.");
        } finally {
            setLoading(false);
        }
    };

    // [NEW] Hiển thị loading khi đang fetch dữ liệu cũ
    if (isFetchingData) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Đang tải dữ liệu bài viết...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 relative">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-4 pt-2 border-b flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        {news?.id ? "Chỉnh sửa bài viết" : "Soạn thảo bài mới"}
                    </h3>
                </div>
                <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        <XCircle className="w-4 h-4 mr-2" /> Hủy
                    </Button>
                    <Button type="submit" disabled={loading} className="min-w-[120px]">
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {news?.id ? 'Cập nhật' : 'Đăng tin'}
                    </Button>
                </div>
            </div>

            {errorMessage && (
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Nội dung tin tức</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tiêu đề *</Label>
                                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Nhập tiêu đề..." />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Nội dung chi tiết *</Label>
                                <RichTextEditor 
                                    value={form.content} 
                                    onChange={(html) => setForm({...form, content: html})} 
                                    disabled={loading}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Cài đặt hiển thị</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Phân loại</Label>
                                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                                    <SelectTrigger><SelectValue placeholder="Chọn loại tin" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="THÔNG BÁO CHUNG">THÔNG BÁO CHUNG</SelectItem>
                                        <SelectItem value="THÔNG BÁO ĐỒ ÁN">THÔNG BÁO ĐỒ ÁN</SelectItem>
                                        <SelectItem value="TIN TỨC">TIN TỨC</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between border p-3 rounded-md">
                                <div className="flex items-center gap-2">
                                    <Pin className="h-4 w-4 text-orange-500" />
                                    <Label htmlFor="pinned-switch" className="cursor-pointer">Ghim lên đầu</Label>
                                </div>
                                <Switch id="pinned-switch" checked={form.is_pinned} onCheckedChange={c => setForm({...form, is_pinned: c})} />
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Đối tượng xem</Label>
                                <div className="grid gap-2">
                                    {TARGET_ROLES.map(role => (
                                        <div key={role.id} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`role-${role.id}`} 
                                                checked={form.target_roles.includes(role.id)}
                                                onCheckedChange={(c) => handleTargetRoleChange(role.id, c)}
                                            />
                                            <label htmlFor={`role-${role.id}`} className="text-sm cursor-pointer">{role.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Hình ảnh & Tài liệu</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Ảnh bìa</Label>
                                <div 
                                    onClick={() => coverInputRef.current?.click()}
                                    className="border-2 border-dashed rounded-md p-4 cursor-pointer hover:bg-muted/50 text-center transition-colors"
                                >
                                    {form.cover_preview ? (
                                        <div className="relative group">
                                            <img src={form.cover_preview} alt="Cover" className="w-full h-32 object-cover rounded-md" />
                                            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white text-xs">Thay đổi</div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-muted-foreground py-4">
                                            <Upload className="h-8 w-8 mb-2" />
                                            <span className="text-xs">Click để tải ảnh bìa</span>
                                        </div>
                                    )}
                                    <Input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverImageChange} />
                                </div>
                                {form.cover_preview && <Button variant="ghost" size="sm" className="w-full text-destructive h-8 mt-1" onClick={() => setForm({...form, cover_preview: null, cover_image: null})}>Xóa ảnh</Button>}
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label>File đính kèm (PDF)</Label>
                                <Input type="file" accept=".pdf" onChange={handlePdfChange} ref={pdfInputRef} />
                                {fileName && <Badge variant="secondary" className="mt-2 w-full justify-between">{fileName} <X className="h-3 w-3 cursor-pointer" onClick={() => {setFileName(''); setForm({...form, pdf_file: null});}}/></Badge>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </form>
    );
};

export default NewsForm;