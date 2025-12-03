import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    Send, BookOpen, User, Layers, Users,
    Target, Check, MessageSquare, Loader2,
    CheckCircle, Edit, XCircle, ChevronLeft, ChevronRight,
    Clock, Info, AlertCircle, Save, X, Edit3, ArrowRight,
    RotateCcw, AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// --- API Services ---
import { useAuth } from '@/contexts/AuthContext';
import { thesisTopicService } from '@/api/thesisTopicService';
import { getTopicHistory } from '@/api/historyService';
import { getKhoaBomons } from '@/api/userService';
import axiosClient from '@/api/axiosConfig';
import { toast } from 'sonner';

// --- Shared Components ---
import InlineDiff from '@/components/shared/InlineDiff';
import HistoryTimeline from '@/components/shared/HistoryTimeline';

// ==========================================
// 1. CÁC COMPONENT UI NHỎ (HELPER)
// ==========================================

const MetadataCard = ({ icon: Icon, label, value, oldValue }) => {
    const hasDiff = (oldValue !== undefined) && (String(oldValue || '') !== String(value || ''));

    return (
        <div className={cn(
            "flex flex-col gap-1 p-3 rounded-xl border transition-all h-full justify-center",
            hasDiff 
                ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" 
                : "bg-card border-border shadow-sm"
        )}>
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
            </div>
            
            <div className="text-sm font-medium text-foreground truncate">
                {hasDiff ? (
                    <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        <span className="line-through text-red-500 decoration-red-500 bg-red-50 dark:bg-red-950/50 px-1.5 rounded text-xs" title="Giá trị cũ">
                            {oldValue || "(Trống)"}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/50 px-1.5 rounded font-bold text-xs border border-green-200 dark:border-green-800" title="Giá trị mới">
                            {value || "(Trống)"}
                        </span>
                    </div>
                ) : (
                    <span title={value}>{value || "—"}</span>
                )}
            </div>
        </div>
    );
};

const ChatBubble = ({ user, message, isMe, time, role }) => (
    <div className={cn("flex gap-3 max-w-[90%]", isMe ? "ml-auto flex-row-reverse" : "")}>
        <Avatar className="h-8 w-8 mt-1 border border-border shrink-0">
            <AvatarImage src={user?.AVATAR_URL} />
            <AvatarFallback className={cn("text-xs font-bold", isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {getInitials(user?.HODEM_VA_TEN)}
            </AvatarFallback>
        </Avatar>
        <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
            <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold text-foreground">
                    {user?.HODEM_VA_TEN || 'Người dùng'}
                </span>
                {role && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 rounded-sm">
                        {role}
                    </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                    {time ? formatDistanceToNow(new Date(time), { addSuffix: true, locale: vi }) : ''}
                </span>
            </div>
            <div className={cn(
                "px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm leading-relaxed",
                isMe
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted/80 text-foreground border border-border/50 rounded-tl-none"
            )}>
                {message}
            </div>
        </div>
    </div>
);

const getStatusBadge = (status) => {
    const styles = {
        'Đã duyệt': "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-green-800",
        'Chờ duyệt': "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-yellow-800",
        'Yêu cầu chỉnh sửa': "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
        'Từ chối': "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400",
        'Nháp': "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
    };
    const defaultStyle = "bg-secondary text-secondary-foreground border-border";

    return (
        <Badge variant="outline" className={cn("px-2.5 py-0.5 text-xs font-semibold shadow-none border", styles[status] || defaultStyle)}>
            {status}
        </Badge>
    );
};

const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    // Lấy chữ cái đầu của tên và họ (hoặc 2 chữ cái đầu nếu ngắn)
    const first = parts[0][0] || '';
    const last = parts[parts.length - 1][0] || '';
    return (first + last).toUpperCase();
};

// ==========================================
// 2. COMPONENT CHÍNH
// ==========================================

const TopicDetailDialog = ({
    open,
    onOpenChange,
    topicId,
    showAdminActions = false,
    onApprove,
    onReject,
    onRequestEdit,
    onNext,
    onPrevious,
    hasNext,
    hasPrevious,
    onDataChange
}) => {
    const { user } = useAuth();
    
    // Data States
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(false);
    const [comparisonData, setComparisonData] = useState(null); 
    const [departments, setDepartments] = useState([]);

    // UI States
    const [activeTab, setActiveTab] = useState('info'); // 'info' | 'history'
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // History States
    const [historyItems, setHistoryItems] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Chat States
    const [replyInputs, setReplyInputs] = useState({});
    const [newSuggestion, setNewSuggestion] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Refs
    const chatEndRef = useRef(null);
    const scrollAreaRef = useRef(null);

    // --- Permission Check ---
    const isOwner = topic && String(topic.ID_NGUOI_DEXUAT) === String(user?.giangvien?.ID_GIANGVIEN);
    const isAdmin = ['Admin', 'Giáo vụ', 'Trưởng khoa'].includes(user?.vaitro?.TEN_VAITRO);
    
    const canEdit = topic && ((isOwner && ['Nháp', 'Yêu cầu chỉnh sửa', 'Đang chỉnh sửa', 'Đã duyệt'].includes(topic.TRANGTHAI)) || isAdmin);
    const canComment = topic && !['Đã duyệt', 'Từ chối', 'Đã khóa', 'Đã đầy'].includes(topic.TRANGTHAI);

    // --- [MỚI] Check Reuse ---
    const isReused = topic?.LA_TAISUDUNG;
    const isApproved = topic?.TRANGTHAI === 'Đã duyệt';

    // --- EFFECTS ---

    useEffect(() => {
        if (open && topicId) {
            loadTopicDetails(true);
            loadDepartments();
            loadComparison(); 
            if (activeTab === 'history') loadHistory();
        } else if (!open) {
            setTopic(null);
            setComparisonData(null);
            setIsEditing(false);
            setNewSuggestion('');
            setHistoryItems([]);
            setActiveTab('info');
        }
    }, [open, topicId]);

    // --- [ADD] KEYBOARD NAVIGATION ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!open) return;
            // Nếu đang chỉnh sửa, không điều hướng bằng phím để tránh xung đột khi gõ text
            if (isEditing) return;

            if (e.key === 'ArrowLeft' && hasPrevious) {
                onPrevious();
            } else if (e.key === 'ArrowRight' && hasNext) {
                onNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, isEditing, hasNext, hasPrevious, onNext, onPrevious]); // <-- Quan trọng: Thêm onNext, onPrevious
    // ---------------------------------

    useEffect(() => {
        if (open && topicId && activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab, topicId]);

    useEffect(() => {
        if (topic?.goiyDetai && chatEndRef.current) {
            setTimeout(() => chatEndRef.current.scrollIntoView({ behavior: "smooth" }), 100);
        }
    }, [topic?.goiyDetai?.length, isEditing]);

    // --- DATA FETCHING ---

    const loadTopicDetails = async (showLoader = false) => {
        try {
            if (showLoader) setLoading(true);
            const res = await thesisTopicService.getTopicById(topicId);
            setTopic(res.data);
            setEditFormData({
                TEN_DETAI: res.data.TEN_DETAI,
                MOTA: res.data.MOTA,
                ID_KHOA_BOMON: res.data.ID_KHOA_BOMON ? String(res.data.ID_KHOA_BOMON) : '',
                YEUCAU: res.data.YEUCAU || '',
                MUCTIEU: res.data.MUCTIEU || '',
                KETQUA_MONGDOI: res.data.KETQUA_MONGDOI || '',
                SO_NHOM_TOIDA: res.data.SO_NHOM_TOIDA || 1
            });
        } catch (error) {
            toast.error("Không thể tải chi tiết đề tài.");
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    const loadComparison = async () => {
        try {
            const res = await axiosClient.get(`/history/topic/${topicId}/comparison`);
            setComparisonData(res.data || {});
        } catch (error) {
            console.error("Comparison load error", error);
        }
    };

    const loadDepartments = async () => {
        try {
            const res = await getKhoaBomons();
            setDepartments(res || []);
        } catch (error) {}
    };

    const loadHistory = async () => {
        if (!topicId) return;
        setHistoryLoading(true);
        try {
            const res = await getTopicHistory(topicId, { per_page: 50 });
            setHistoryItems(res.data || []);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    // --- HELPER: Lấy tên bộ môn từ ID ---
    const getDepartmentName = (id) => {
        if (!id) return null;
        const dept = departments.find(d => String(d.ID_KHOA_BOMON) === String(id));
        return dept ? dept.TEN_KHOA_BOMON : `ID: ${id}`;
    };

    // --- ACTION HANDLERS ---

    const handleSave = async () => {
        if (!editFormData.TEN_DETAI || !editFormData.MOTA) {
            toast.error("Vui lòng điền tên và mô tả.");
            return;
        }
        setIsSaving(true);
        try {
            const res = await thesisTopicService.updateTopic(topicId, editFormData);
            setTopic(res.data);
            
            // Nếu là đề tài tái sử dụng đã duyệt, backend sẽ tự đổi status về 'Chờ duyệt'
            // Cần thông báo cho user biết
            if (isReused && isApproved && !isAdmin && res.data.TRANGTHAI === 'Chờ duyệt') {
                 toast.warning("Đề tài đã chuyển sang trạng thái 'Chờ duyệt' do có sự thay đổi.");
            } else {
                 toast.success("Cập nhật thành công.");
            }

            setIsEditing(false);
            if (onDataChange) onDataChange();
            
            // Load lại so sánh sau khi lưu
            loadComparison();
        } catch (error) {
            toast.error("Cập nhật thất bại.");
        } finally {
            setIsSaving(false);
        }
    };

    // [MỚI] Xử lý khi bấm nút Chỉnh sửa
    const handleEditClick = () => {
        if (isReused && isApproved && !isAdmin) {
            if (!window.confirm("CẢNH BÁO QUAN TRỌNG:\n\nĐây là đề tài Tái sử dụng đã được duyệt tự động.\nNếu bạn chỉnh sửa nội dung, trạng thái sẽ chuyển về 'Chờ duyệt' và cần cấp trên phê duyệt lại.\n\nBạn có chắc chắn muốn tiếp tục?")) {
                return;
            }
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditFormData({
            TEN_DETAI: topic.TEN_DETAI,
            MOTA: topic.MOTA,
            ID_KHOA_BOMON: topic.ID_KHOA_BOMON ? String(topic.ID_KHOA_BOMON) : '',
            YEUCAU: topic.YEUCAU || '',
            MUCTIEU: topic.MUCTIEU || '',
            KETQUA_MONGDOI: topic.KETQUA_MONGDOI || '',
            SO_NHOM_TOIDA: topic.SO_NHOM_TOIDA || 1
        });
        setIsEditing(false);
    };
    
    const handleInputChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    // --- CHAT LOGIC ---
    const sendMessage = async (content, parentId = null) => {
        if (!content.trim()) return;
        
        const newMsg = {
            ID_GOIY: parentId || Date.now(),
            ID_PHANHOI: Date.now(),
            NOIDUNG: content, NOIDUNG_GOIY: content,
            NGAYTAO: new Date().toISOString(), created_at: new Date().toISOString(),
            giangvien: { nguoidung: user },
            ID_GIANGVIEN: user?.giangvien?.ID_GIANGVIEN,
            phanhois: []
        };

        if (parentId) {
             setTopic(prev => ({
                ...prev,
                goiyDetai: prev.goiyDetai.map(g => g.ID_GOIY === parentId ? { ...g, phanhois: [...(g.phanhois||[]), newMsg] } : g)
             }));
             setReplyInputs(prev => ({...prev, [parentId]: ''}));
        } else {
            setTopic(prev => ({ ...prev, goiyDetai: [...(prev.goiyDetai||[]), newMsg] }));
            setNewSuggestion('');
            setIsSending(true);
        }

        try {
            if (parentId) await thesisTopicService.addReplyToSuggestion(parentId, { NOIDUNG: content });
            else await thesisTopicService.addSuggestion(topicId, { NOIDUNG_GOIY: content });
            
            loadTopicDetails(false);
            if(onDataChange) onDataChange();
        } catch(e) {
            toast.error("Gửi tin nhắn thất bại");
        } finally {
            setIsSending(false);
        }
    };

    // --- RENDER HELPER: FIELD WITH DIFF ---
    const renderField = (key, label, icon, isArea = false) => {
        const currentValue = topic?.[key] || "";

        const hasHistoryData = comparisonData && Object.prototype.hasOwnProperty.call(comparisonData, key);
        const rawOldValue = hasHistoryData ? comparisonData[key] : undefined;
        
        const hasDiff = hasHistoryData && 
                        (String(rawOldValue || '') !== String(currentValue || '')) && 
                        !isEditing;

        const displayOldValue = rawOldValue || ""; 

        if (isEditing) {
            return (
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">{label}</Label>
                    {isArea ? (
                        <Textarea 
                            value={editFormData[key]} 
                            onChange={e => setEditFormData({...editFormData, [key]: e.target.value})} 
                            rows={5}
                            className="bg-background font-normal"
                        />
                    ) : (
                        <Input 
                            value={editFormData[key]} 
                            onChange={e => setEditFormData({...editFormData, [key]: e.target.value})} 
                            className="bg-background font-normal"
                        />
                    )}
                </div>
            );
        }

        if (!currentValue && !hasDiff) return null;

        return (
            <div className={cn(
                "group relative rounded-lg border p-4 transition-all",
                hasDiff 
                    ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800" 
                    : "bg-card border-border hover:border-primary/20"
            )}>
                {hasDiff && (
                    <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-[10px] font-bold uppercase rounded-full border border-amber-200 flex items-center gap-1 shadow-sm z-10">
                        <Edit3 className="w-3 h-3" /> Thay đổi
                    </div>
                )}
                
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                    {icon} {label}
                </h4>
                
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {hasDiff ? (
                        <InlineDiff oldValue={displayOldValue} newValue={currentValue} />
                    ) : (
                        currentValue
                    )}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v && isEditing) { setIsEditing(false); }
            onOpenChange(v);
        }}>
            <DialogContent className="max-w-[95vw] lg:max-w-[90vw] xl:max-w-[1400px] h-[90vh] p-0 flex flex-col bg-background gap-0 overflow-hidden border-none shadow-2xl sm:rounded-2xl">
                
                {/* 1. HEADER */}
                <DialogHeader className="px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 flex flex-row items-center justify-between space-y-0 z-10">
                    <div className="flex items-start gap-4 overflow-hidden flex-1">
                        <div className="h-12 w-12 mt-1 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-primary shrink-0 shadow-sm">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {/* Check nếu loading và chưa có topic thì hiện skeleton hoặc chờ */}
                            {loading && !topic ? (
                                <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                            ) : isEditing ? (
                                <Input 
                                    value={editFormData.TEN_DETAI}
                                    onChange={e => setEditFormData({...editFormData, TEN_DETAI: e.target.value})}
                                    className="text-lg font-bold h-10 px-3 border-primary/50 bg-accent/50"
                                    placeholder="Nhập tên đề tài..."
                                />
                            ) : (
                                <DialogTitle className="text-xl font-bold text-foreground leading-tight mb-1.5 line-clamp-1">
                                    {topic?.TEN_DETAI || "Đang tải..."}
                                </DialogTitle>
                            )}
                            
                            {/* Chỉ hiển thị badge khi không loading hoặc đã có data topic */}
                            {(!loading || topic) && topic && (
                                <div className="flex items-center gap-3 mt-1.5">
                                    <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-5 border-border/50">{topic.MA_DETAI}</Badge>
                                    {getStatusBadge(topic.TRANGTHAI)}

                                    {isReused && (
                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 pl-1 pr-2">
                                            <RotateCcw className="w-3 h-3" /> Tái sử dụng
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions Top Right */}
                    <div className="flex items-center gap-2 ml-4">
                        {!isEditing && canEdit && topic && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleEditClick} 
                                className="h-9 border-dashed border-primary/50 text-primary hover:bg-primary/5"
                            >
                                <Edit className="w-4 h-4 mr-2" /> Chỉnh sửa
                            </Button>
                        )}
                        {isEditing && (
                            <div className="flex gap-2 animate-in fade-in slide-in-from-right-5 duration-200">
                                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Hủy</Button>
                                <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-primary text-primary-foreground shadow-md">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Lưu
                                </Button>
                            </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => onOpenChange(false)}>
                            <X className="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </div>
                </DialogHeader>

                {/* 2. TAB NAVIGATION */}
                <div className="px-6 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex gap-6">
                        <button 
                            onClick={() => { setActiveTab('info'); if(isEditing) handleCancelEdit(); }}
                            className={cn(
                                "py-3 text-sm font-medium border-b-2 transition-colors outline-none",
                                activeTab === 'info' 
                                    ? "border-primary text-primary" 
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Thông tin & Thảo luận
                        </button>
                        <button 
                            onClick={() => { setActiveTab('history'); if(isEditing) handleCancelEdit(); }}
                            className={cn(
                                "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 outline-none",
                                activeTab === 'history' 
                                    ? "border-primary text-primary" 
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Clock className="w-4 h-4" /> Lịch sử thay đổi
                        </button>
                    </div>
                </div>

                {/* 3. BODY CONTENT - Dùng relative để chứa Loading Overlay */}
                <div className="flex-1 overflow-hidden bg-secondary/10 relative">
                    
                    {/* LOADING OVERLAY - Hiển thị đè lên nội dung thay vì thay thế toàn bộ DialogContent */}
                    {loading && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
                            <p className="text-sm text-muted-foreground animate-pulse">Đang tải dữ liệu...</p>
                        </div>
                    )}

                    {/* Chỉ render nội dung khi có data 'topic' (hoặc giữ lại UI cũ nếu đang loading đè lên) */}
                    {topic && activeTab === 'info' && (
                        <div className="flex h-full animate-in fade-in duration-300">
                            
                            {/* CỘT TRÁI: NỘI DUNG CHÍNH */}
                            <ScrollArea className="flex-1 h-full">
                                <div className="p-6 max-w-5xl mx-auto space-y-8">
                                    
                                    {/* [MỚI] Alert: Cảnh báo khi sửa đề tài tái sử dụng */}
                                    {isEditing && isReused && isApproved && !isAdmin && (
                                        <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 mb-4">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle className="font-bold">Lưu ý khi chỉnh sửa</AlertTitle>
                                            <AlertDescription>
                                                Bạn đang sửa một đề tài tái sử dụng đã được duyệt. Sau khi lưu, trạng thái sẽ chuyển thành <strong>Chờ duyệt</strong> để cấp trên xem xét lại.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Alert: Lý do từ chối / yêu cầu sửa */}
                                    {!isEditing && (topic.TRANGTHAI === 'Yêu cầu chỉnh sửa' || topic.TRANGTHAI === 'Từ chối') && topic.LYDO_TUCHOI && (
                                        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 shadow-sm">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle className="ml-2 font-bold">
                                                {topic.TRANGTHAI === 'Từ chối' ? 'Đề tài bị từ chối' : 'Yêu cầu chỉnh sửa từ quản lý'}
                                            </AlertTitle>
                                            <AlertDescription className="mt-2 pl-6 text-sm opacity-90">
                                                {topic.LYDO_TUCHOI}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <MetadataCard icon={User} label="Giảng viên" value={topic.ten_giang_vien} />
                                        
                                        {isEditing ? (
                                            <div className="flex flex-col gap-1 p-3 rounded-xl border bg-card shadow-sm">
                                                 <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                    <Layers className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] uppercase font-bold tracking-wider">Bộ môn</span>
                                                </div>
                                                <Select value={editFormData.ID_KHOA_BOMON} onValueChange={v => setEditFormData({...editFormData, ID_KHOA_BOMON: v})}>
                                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{departments.map(d => <SelectItem key={d.ID_KHOA_BOMON} value={String(d.ID_KHOA_BOMON)}>{d.TEN_KHOA_BOMON}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        ) : (
                                            <MetadataCard 
                                                icon={Layers} 
                                                label="Bộ môn" 
                                                value={topic.ten_bo_mon || topic.khoaBomon?.TEN_KHOA_BOMON} 
                                                oldValue={comparisonData && Object.prototype.hasOwnProperty.call(comparisonData, 'ID_KHOA_BOMON') 
                                                    ? getDepartmentName(comparisonData.ID_KHOA_BOMON) 
                                                    : undefined} 
                                            />
                                        )}

                                        {isEditing ? (
                                             <div className="flex flex-col gap-1 p-3 rounded-xl border bg-card shadow-sm">
                                                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] uppercase font-bold tracking-wider">Nhóm tối đa</span>
                                                </div>
                                                <Input type="number" className="h-8 text-sm" value={editFormData.SO_NHOM_TOIDA} onChange={e => setEditFormData({...editFormData, SO_NHOM_TOIDA: e.target.value})} />
                                            </div>
                                        ) : (
                                            <MetadataCard 
                                                icon={Users} 
                                                label="Nhóm tối đa" 
                                                value={topic.SO_NHOM_TOIDA} 
                                                oldValue={comparisonData && Object.prototype.hasOwnProperty.call(comparisonData, 'SO_NHOM_TOIDA') 
                                                    ? comparisonData.SO_NHOM_TOIDA 
                                                    : undefined} 
                                            />
                                        )}

                                        <MetadataCard icon={Clock} label="Đã đăng ký" value={`${topic.SO_NHOM_HIENTAI} nhóm`} />
                                    </div>

                                    <Separator />

                                    {/* Nội dung chi tiết */}
                                    <div className="grid grid-cols-1 gap-8">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            {renderField('YEUCAU', 'Yêu cầu kiến thức', <Check className="w-4 h-4" />, true)}
                                            {renderField('KETQUA_MONGDOI', 'Kết quả mong đợi', <Target className="w-4 h-4" />, true)}
                                        </div>
                                        
                                        {renderField('MUCTIEU', 'Mục tiêu đề tài', <Target className="w-4 h-4 text-red-500" />, true)}
                                        {renderField('MOTA', 'Mô tả chi tiết', <Info className="w-4 h-4 text-blue-500" />, true)}
                                    </div>

                                    {/* Padding bottom để không bị che bởi footer nếu màn hình nhỏ */}
                                    <div className="h-10"></div>
                                </div>
                            </ScrollArea>

                            {/* CỘT PHẢI: THẢO LUẬN (LUÔN HIỂN THỊ) */}
                            <div className="w-[380px] xl:w-[420px] flex flex-col border-l border-border bg-background transition-all duration-300 ease-in-out">
                                <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/20">
                                    <MessageSquare className="w-4 h-4 text-primary" />
                                    <h3 className="font-bold text-sm">Thảo luận ({topic.goiyDetai?.length || 0})</h3>
                                </div>

                                <ScrollArea className="flex-1 p-4 bg-muted/5" ref={scrollAreaRef}>
                                    <div className="space-y-6">
                                        {!topic.goiyDetai?.length ? (
                                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10 opacity-60">
                                                <MessageSquare className="w-10 h-10 mb-2 stroke-1" />
                                                <p className="text-sm">Chưa có thảo luận nào</p>
                                            </div>
                                        ) : (
                                            topic.goiyDetai.map((thread) => (
                                                <div key={thread.ID_GOIY} className="space-y-3 mb-6">
                                                    {/* Main Comment */}
                                                    <ChatBubble 
                                                        user={thread.giangvien?.nguoidung} 
                                                        message={thread.NOIDUNG_GOIY} 
                                                        time={thread.NGAYTAO} 
                                                        isMe={thread.ID_GIANGVIEN === user?.giangvien?.ID_GIANGVIEN}
                                                        role="Người góp ý"
                                                    />
                                                    
                                                    {/* Replies */}
                                                    <div className="pl-4 space-y-3 border-l-2 border-border/50 ml-4">
                                                        {thread.phanhois?.map(reply => (
                                                            <ChatBubble 
                                                                key={reply.ID_PHANHOI}
                                                                user={reply.giangvien?.nguoidung} 
                                                                message={reply.NOIDUNG} 
                                                                time={reply.created_at} 
                                                                isMe={reply.ID_GIANGVIEN === user?.giangvien?.ID_GIANGVIEN}
                                                                role={reply.ID_GIANGVIEN === topic.ID_NGUOI_DEXUAT ? 'Tác giả' : null}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Reply Input */}
                                                    {canComment && (
                                                        <div className="pl-8">
                                                            <div className="relative">
                                                                <Input 
                                                                    placeholder="Nhập câu trả lời..." 
                                                                    className="h-9 text-xs pr-8 bg-background rounded-full shadow-sm focus-visible:ring-1"
                                                                    value={replyInputs[thread.ID_GOIY] || ''}
                                                                    onChange={e => setReplyInputs({...replyInputs, [thread.ID_GOIY]: e.target.value})}
                                                                    onKeyDown={e => e.key === 'Enter' && sendMessage(e.target.value, thread.ID_GOIY)}
                                                                />
                                                                <button 
                                                                    onClick={() => sendMessage(replyInputs[thread.ID_GOIY], thread.ID_GOIY)}
                                                                    className="absolute right-1.5 top-1.5 text-primary hover:text-primary/80"
                                                                >
                                                                    <Send className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>
                                </ScrollArea>

                                {/* New Message Input */}
                                {canComment && (
                                    <div className="p-3 border-t bg-background">
                                        <div className="relative shadow-sm rounded-xl border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                                            <Textarea 
                                                placeholder="Nhập nội dung thảo luận mới..." 
                                                className="min-h-[50px] max-h-[120px] w-full resize-none border-0 bg-transparent py-3 pl-3 pr-10 text-sm placeholder:text-muted-foreground focus-visible:ring-0"
                                                value={newSuggestion}
                                                onChange={e => setNewSuggestion(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        sendMessage(newSuggestion);
                                                    }
                                                }}
                                            />
                                            <div className="absolute bottom-2 right-2">
                                                <Button 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                                                    disabled={!newSuggestion.trim() || isSending}
                                                    onClick={() => sendMessage(newSuggestion)}
                                                >
                                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* === TAB 2: LỊCH SỬ THAY ĐỔI === */}
                    {topic && activeTab === 'history' && (
                        <div className="h-full p-6 overflow-y-auto custom-scrollbar bg-background animate-in fade-in duration-300">
                            <div className="mx-auto">
                                <div className="mb-6 flex items-center gap-2 text-muted-foreground">
                                    <Clock className="w-5 h-5" />
                                    <h3 className="text-lg font-semibold text-foreground">Lịch sử hoạt động của đề tài</h3>
                                </div>
                                <HistoryTimeline items={historyItems} isLoading={historyLoading} />
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. FOOTER: NAVIGATION & MAIN ACTIONS */}
                <div className="px-6 py-4 border-t bg-background shrink-0 flex items-center justify-between z-10">
                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={onPrevious} 
                            disabled={!hasPrevious} 
                            className="w-9 p-0 rounded-full border-dashed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs font-mono text-muted-foreground px-2">Điều hướng</span>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={onNext} 
                            disabled={!hasNext} 
                            className="w-9 p-0 rounded-full border-dashed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Main Actions */}
                    {!isEditing && showAdminActions && topic && (
                        <div className="flex gap-3">
                             <Button variant="ghost" onClick={() => onReject(topic)} className="text-destructive hover:bg-destructive/10 hover:text-destructive h-9">
                                <XCircle className="w-4 h-4 mr-2" /> Từ chối
                            </Button>
                            <Button variant="outline" onClick={() => onRequestEdit(topic)} className="h-9 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800">
                                <Edit className="w-4 h-4 mr-2" /> Yêu cầu sửa
                            </Button>
                            <Button onClick={() => onApprove(topic.ID_DETAI)} className="h-9 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all">
                                <CheckCircle className="w-4 h-4 mr-2" /> Duyệt đề tài
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TopicDetailDialog;