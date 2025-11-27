import React, { useState, useEffect, useMemo, useCallback } from "react";
import axiosClient from "@/api/axiosConfig";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, ArrowLeft, Search, User, Users, CheckCircle2, ArrowRight, Sparkles, 
  X, BookOpen, GraduationCap, Building2, AlertCircle 
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { autoAssignGroups } from "@/api/adminHoiDongService";
import { getKhoaBomons } from "@/api/userService"; 

const PhanboHoiDong = () => {
  const [kehoach, setKehoach] = useState([]);
  const [hoidongList, setHoidongList] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  
  const [filterOptions, setFilterOptions] = useState({ chuyennganh: [], khoabomon: [] });

  const [chonKehoach, setChonKehoach] = useState("");
  const [selectedCouncilId, setSelectedCouncilId] = useState(null);

  const [searchCouncil, setSearchCouncil] = useState("");
  const [searchGroup, setSearchGroup] = useState("");
  const [filterChuyenNganh, setFilterChuyenNganh] = useState("all");
  const [filterBoMon, setFilterBoMon] = useState("all");

  const [loading, setLoading] = useState(false);
  
  const [dialogState, setDialogState] = useState({ isOpen: false, group: null });
  const [isAutoAssignDialogOpen, setIsAutoAssignDialogOpen] = useState(false);
  const [autoAssignType, setAutoAssignType] = useState("hoidong");

  const [removeDialogState, setRemoveDialogState] = useState({ isOpen: false, groupId: null, councilId: null });

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [khRes, cnRes, bmRes] = await Promise.all([
          axiosClient.get("/admin/hoidong/kehoach-options"),
          axiosClient.get("/admin/hoidong/chuyennganh-options"),
          getKhoaBomons(), 
        ]);

        setKehoach(khRes.data || []);
        setFilterOptions({
          chuyennganh: (cnRes.data || []).map(cn => ({
            value: String(cn.ID_CHUYENNGANH),
            label: cn.TEN_CHUYENNGANH,
          })),
          khoabomon: (bmRes || []).map(bm => ({
            value: String(bm.ID_KHOA_BOMON),
            label: bm.TEN_KHOA_BOMON,
          })),
        });
        
        if (khRes.data && khRes.data.length > 0) {
            setChonKehoach(String(khRes.data[0].ID_KEHOACH));
        }
      } catch (error) {
        toast.error("Không thể tải dữ liệu ban đầu!");
      }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!chonKehoach) {
      setAllGroups([]);
      setHoidongList([]);
      setSelectedCouncilId(null);
      return;
    }

    setLoading(true);
    try {
      const [nhomRes, hoidongRes] = await Promise.all([
        axiosClient.get(`/admin/hoidong/${chonKehoach}/nhoms`),
        axiosClient.get("/admin/hoidong", { params: { kehoach: chonKehoach, all: true } }),
      ]);

      setAllGroups(nhomRes.data || []);
      setHoidongList(hoidongRes.data || []);

      const councils = hoidongRes.data || [];
      if (councils.length > 0 && !councils.some(c => c.ID_HOIDONG === selectedCouncilId)) {
        setSelectedCouncilId(councils[0].ID_HOIDONG);
      } else if (councils.length === 0) {
        setSelectedCouncilId(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Lỗi tải dữ liệu phân bổ.");
    } finally {
      setLoading(false);
    }
  }, [chonKehoach, selectedCouncilId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCouncils = useMemo(() => {
    if (!searchCouncil) return hoidongList;
    const term = searchCouncil.toLowerCase();
    return hoidongList.filter(hd => {
      const matchName = hd.TEN_HOIDONG.toLowerCase().includes(term);
      const matchLecturer = hd.giangviens?.some(gv =>
        gv.nguoidung?.HODEM_VA_TEN.toLowerCase().includes(term)
      );
      return matchName || matchLecturer;
    });
  }, [hoidongList, searchCouncil]);

  const filteredGroups = useMemo(() => {
    let list = allGroups;
    if (searchGroup) {
      const term = searchGroup.toLowerCase();
      list = list.filter(g =>
        g.TEN_NHOM.toLowerCase().includes(term) ||
        (g.TEN_DETAI && g.TEN_DETAI.toLowerCase().includes(term))
      );
    }
    if (filterChuyenNganh !== "all") {
      list = list.filter(g => String(g.ID_CHUYENNGANH) === filterChuyenNganh);
    }
    
    if (filterBoMon !== "all") {
      list = list.filter(g => {
          // Lọc dựa trên ID trả về từ backend
          const deptId = g.ID_KHOA_BOMON; 
          return String(deptId) === filterBoMon;
      });
    }
    return list;
  }, [allGroups, searchGroup, filterChuyenNganh, filterBoMon]);

  const executeMoveGroup = async (groupToMove, targetCouncilId) => {
      const targetCouncil = hoidongList.find(h => h.ID_HOIDONG === targetCouncilId);
      const previousGroups = [...allGroups];
      setAllGroups(prev =>
        prev.map(g =>
          g.ID_NHOM === groupToMove.ID_NHOM
            ? { ...g, ID_HOIDONG: targetCouncilId, TEN_HOIDONG: targetCouncil?.TEN_HOIDONG }
            : g
        )
      );

      try {
        await axiosClient.post("/admin/hoidong/phanbo-nhom", [
          { ID_NHOM: groupToMove.ID_NHOM, ID_HOIDONG: targetCouncilId },
        ]);
        toast.success(`Đã chuyển nhóm "${groupToMove.TEN_NHOM}" sang ${targetCouncil?.TEN_HOIDONG}`);
      } catch (error) {
        setAllGroups(previousGroups);
        toast.error("Lỗi khi chuyển nhóm. Đã hoàn tác.");
      }
  };

  const onGroupClick = (group) => {
    if (!selectedCouncilId) {
      toast.warning("Vui lòng chọn Hội đồng đích ở cột bên phải trước!");
      return;
    }
    if (group.ID_HOIDONG === selectedCouncilId) {
      toast.info("Nhóm này đã thuộc hội đồng đang chọn.");
      return;
    }

    if (group.ID_HOIDONG) {
        setDialogState({ isOpen: true, group });
    } else {
        executeMoveGroup(group, selectedCouncilId);
    }
  };

  const handleConfirmMove = async () => {
    const { group } = dialogState;
    if (group && selectedCouncilId) {
        await executeMoveGroup(group, selectedCouncilId);
    }
    setDialogState({ isOpen: false, group: null });
  };

  const handleRemoveClick = (e, groupId, councilId) => {
    e.stopPropagation();
    setRemoveDialogState({ isOpen: true, groupId, councilId });
  }

  const handleConfirmRemove = async () => {
    const { groupId, councilId } = removeDialogState;
    if(!groupId || !councilId) return;

    const previousGroups = [...allGroups];
    setAllGroups(prev => prev.map(g => g.ID_NHOM === groupId ? { ...g, ID_HOIDONG: null, TEN_HOIDONG: null } : g));
    
    setRemoveDialogState({ isOpen: false, groupId: null, councilId: null });

    try {
        await axiosClient.delete(`/admin/hoidong/${councilId}/nhom/${groupId}`);
        toast.success("Đã gỡ nhóm khỏi hội đồng");
    } catch (err) {
        setAllGroups(previousGroups);
        toast.error("Lỗi khi gỡ nhóm");
    }
  }

  const getGroupCountInCouncil = (councilId) => {
    return allGroups.filter(g => g.ID_HOIDONG === councilId).length;
  };

  const handleConfirmAutoAssign = async () => {
    setLoading(true);
    try {
      if (allGroups.filter(g => !g.ID_HOIDONG).length === 0) {
        toast.info("Tất cả các nhóm đã được phân bổ.");
        return;
      }
      const res = await autoAssignGroups(chonKehoach, autoAssignType);
      toast.success(res.message || "Phân bổ tự động thành công!");
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Phân bổ tự động thất bại!");
    } finally {
      setLoading(false);
      setIsAutoAssignDialogOpen(false);
    }
  };

  const currentPlan = kehoach.find(k => String(k.ID_KEHOACH) === chonKehoach);
  const unassignedGroupsCount = allGroups.filter(g => !g.ID_HOIDONG).length;

  return (
    <div className="p-4 md:p-8 h-[calc(100vh-4rem)] flex flex-col bg-muted/10 overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-0 gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="bg-background">
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
          </Button>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            variant="default"
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            onClick={() => {
              if (!chonKehoach) return toast.warning("Vui lòng chọn kế hoạch trước!");
              if (hoidongList.length === 0) return toast.error("Kế hoạch này chưa có Hội đồng nào được tạo!");
              setIsAutoAssignDialogOpen(true);
            }}
            disabled={loading || !chonKehoach || hoidongList.length === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Phân bổ tự động ({unassignedGroupsCount})
          </Button>
        
          <div className="w-full sm:w-[250px] ml-auto">
            <Select value={chonKehoach} onValueChange={setChonKehoach} disabled={loading}>
              <SelectTrigger className="bg-background shadow-sm">
                <SelectValue placeholder="-- Chọn kế hoạch --" />
              </SelectTrigger>
              <SelectContent>
                {kehoach.map(k => (
                  <SelectItem key={k.ID_KEHOACH} value={String(k.ID_KEHOACH)}>
                    {k.TEN_DOT}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="pt-6"></div>

      {loading && !allGroups.length ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !chonKehoach ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-background/50">
          <Users className="w-12 h-12 mb-2 opacity-20" />
          <p>Vui lòng chọn kế hoạch để bắt đầu.</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
          
          {/* Cột trái: Danh sách nhóm */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-0">
            <Card className="flex flex-col h-full border-none shadow-md bg-background overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 border-b bg-muted/10 shrink-0">
                <div className="flex justify-between items-center mb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Danh sách Nhóm - Đề tài
                    <Badge variant="secondary" className="ml-2">{filteredGroups.length}</Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Select value={filterChuyenNganh} onValueChange={setFilterChuyenNganh}>
                      <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
                        <SelectValue placeholder="Chuyên ngành" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả C.Ngành</SelectItem>
                        {filterOptions.chuyennganh.map(cn => (
                          <SelectItem key={cn.value} value={cn.value}>{cn.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterBoMon} onValueChange={setFilterBoMon}>
                      <SelectTrigger className="h-8 w-[140px] text-xs bg-background">
                        <SelectValue placeholder="Bộ môn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả Bộ môn</SelectItem>
                        {filterOptions.khoabomon.map(bm => (
                          <SelectItem key={bm.value} value={bm.value}>{bm.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm tên nhóm, đề tài..."
                    className="pl-9 bg-background border-muted-foreground/20"
                    value={searchGroup}
                    onChange={e => setSearchGroup(e.target.value)}
                  />
                </div>
              </CardHeader>

              <CardContent className="flex-1 min-h-0 p-0 bg-muted/5">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    {filteredGroups.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        Không tìm thấy nhóm nào.
                      </div>
                    ) : (
                      filteredGroups.map(group => {
                        const isAssignedToCurrent = group.ID_HOIDONG === selectedCouncilId;
                        const hasCouncil = !!group.ID_HOIDONG;

                        const tenChuyenNganh = group.TEN_CHUYENNGANH || "Chưa xác định";
                        const tenBoMon = group.TEN_KHOA_BOMON || "Chưa xác định";

                        return (
                          <div
                            key={group.ID_NHOM}
                            onClick={() => onGroupClick(group)}
                            className={cn(
                              "group relative flex flex-col p-3 rounded-lg border bg-background transition-all duration-200 shadow-sm",
                              isAssignedToCurrent
                                ? "border-primary/50 ring-1 ring-primary/20 bg-primary/5 cursor-default"
                                : "hover:border-primary hover:shadow-md cursor-pointer"
                            )}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <h4 className={cn("font-bold text-sm", isAssignedToCurrent ? "text-primary" : "text-foreground")}>
                                {group.TEN_NHOM}
                              </h4>

                              {isAssignedToCurrent ? (
                                <Badge className="bg-primary text-primary-foreground hover:bg-primary text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Đang chọn
                                </Badge>
                              ) : hasCouncil ? (
                                <Badge variant="outline" className="text-[10px] max-w-[120px] truncate bg-muted text-muted-foreground">
                                  {group.TEN_HOIDONG}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
                                  Chưa có
                                </Badge>
                              )}
                            </div>

                            <div className="mt-2 text-xs text-muted-foreground space-y-1">
                              <p className="line-clamp-2 leading-relaxed" title={group.TEN_DETAI}>
                                <span className="font-medium text-foreground/80">Đề tài:</span> {group.TEN_DETAI}
                              </p>
                              
                              <div className="flex flex-wrap gap-y-1 gap-x-3 pt-2 border-t border-border/40 mt-2 text-[11px]">
                                <span className="flex items-center gap-1 truncate max-w-[180px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded" title={`Chuyên ngành: ${tenChuyenNganh}`}>
                                    <GraduationCap className="w-3 h-3 opacity-70"/>
                                    {tenChuyenNganh}
                                </span>
                                <span className="flex items-center gap-1 truncate max-w-[180px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded" title={`Bộ môn: ${tenBoMon}`}>
                                    <Building2 className="w-3 h-3 opacity-70"/>
                                    {tenBoMon}
                                </span>
                              </div>
                            </div>

                            {!isAssignedToCurrent && selectedCouncilId && (
                              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
                                <Badge className="bg-primary text-white shadow-lg pointer-events-auto">
                                  Chuyển sang HĐ đang chọn <ArrowRight className="ml-1 w-3 h-3" />
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Cột phải: Danh sách hội đồng */}
          <div className="lg:col-span-5 flex flex-col h-full min-h-0">
            <Card className="flex flex-col h-full border-none shadow-md bg-background overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 border-b bg-blue-50/30 dark:bg-blue-900/10 shrink-0">
                <div className="flex justify-between items-center mb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Users className="h-4 w-4" />
                    Chọn Hội đồng
                  </CardTitle>
                  <Badge variant="outline" className="bg-background">{filteredCouncils.length}</Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm tên HĐ, Tên GV..."
                    className="pl-9 bg-background border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500"
                    value={searchCouncil}
                    onChange={e => setSearchCouncil(e.target.value)}
                  />
                </div>
              </CardHeader>

              <CardContent className="flex-1 min-h-0 p-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    {filteredCouncils.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        Không tìm thấy hội đồng.
                      </div>
                    ) : (
                      filteredCouncils.map(hd => {
                        const isSelected = selectedCouncilId === hd.ID_HOIDONG;
                        const groupCount = getGroupCountInCouncil(hd.ID_HOIDONG);
                        const assignedGroupsInThisCouncil = allGroups.filter(g => g.ID_HOIDONG === hd.ID_HOIDONG);

                        return (
                          <div
                            key={hd.ID_HOIDONG}
                            onClick={() => setSelectedCouncilId(hd.ID_HOIDONG)}
                            className={cn(
                              "cursor-pointer rounded-lg border p-3 transition-all duration-200 relative",
                              isSelected
                                ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm dark:bg-blue-900/20"
                                : "bg-background hover:border-blue-300 hover:shadow-sm"
                            )}
                          >
                            {isSelected && (
                              <div className="absolute top-0 right-0 p-1 bg-blue-500 rounded-bl-lg">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}

                            <div className="flex justify-between items-center mb-2 pr-4">
                              <h4 className={cn("font-bold text-sm", isSelected ? "text-blue-700 dark:text-blue-400" : "text-foreground")}>
                                {hd.TEN_HOIDONG}
                              </h4>
                              <Badge variant={hd.LOAI === 'phanbien' ? 'secondary' : 'default'} className="text-[10px] px-1.5 h-5">
                                {hd.LOAI === 'phanbien' ? 'Phản biện' : (hd.LOAI === 'hoidong5' ? 'HĐ Bảo vệ (5)' : 'HĐ Bảo vệ (3)')}
                              </Badge>
                            </div>

                            <div className="space-y-1 mb-3">
                              {hd.giangviens?.length > 0 ? (
                                hd.giangviens.map(gv => (
                                  <div key={gv.ID_GIANGVIEN} className="text-xs flex items-center text-muted-foreground">
                                    <User className="w-3 h-3 mr-1.5 opacity-70" />
                                    <span className={cn(gv.pivot?.VAITRO === 'chutich' ? "font-bold text-foreground" : "")}>
                                      {gv.nguoidung?.HODEM_VA_TEN || 'N/A'}
                                    </span>
                                    {gv.pivot?.VAITRO && (
                                      <span className="ml-1 opacity-70 text-[10px]">
                                        ({gv.pivot.VAITRO === 'chutich' ? 'CT' : gv.pivot.VAITRO === 'thuky' ? 'TK' : 'TV'})
                                      </span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Chưa có thành viên</span>
                              )}
                            </div>

                            <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Số nhóm:</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-mono",
                                  groupCount > 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                                )}
                              >
                                {groupCount}
                              </Badge>
                            </div>

                            {isSelected && (
                                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen className="w-3.5 h-3.5 text-blue-600"/>
                                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">
                                            Đề tài đang chấm ({assignedGroupsInThisCouncil.length})
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                                        {assignedGroupsInThisCouncil.length > 0 ? (
                                            assignedGroupsInThisCouncil.map(assignedGroup => (
                                                <div key={assignedGroup.ID_NHOM} className="group/item flex justify-between items-center bg-white dark:bg-slate-950 p-2 rounded border text-xs hover:border-destructive/50 transition-colors shadow-sm">
                                                    <div className="flex-1 min-w-0 mr-2">
                                                        <p className="font-medium truncate text-foreground" title={assignedGroup.TEN_DETAI || assignedGroup.TEN_NHOM}>
                                                            {assignedGroup.TEN_DETAI || assignedGroup.TEN_NHOM}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                            ({assignedGroup.TEN_NHOM})
                                                        </p>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                        onClick={(e) => handleRemoveClick(e, assignedGroup.ID_NHOM, hd.ID_HOIDONG)}
                                                        title="Gỡ nhóm khỏi hội đồng này"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic pl-1">Chưa có nhóm nào được gán.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AlertDialog open={dialogState.isOpen} onOpenChange={open => !open && setDialogState({ isOpen: false, group: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận chuyển nhóm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn chuyển nhóm <strong>{dialogState.group?.TEN_NHOM}</strong>
              {dialogState.group?.TEN_HOIDONG && (
                <> hiện đang ở hội đồng <strong>{dialogState.group.TEN_HOIDONG}</strong></>
              )}
              {' '}sang hội đồng đích <strong>{hoidongList.find(h => h.ID_HOIDONG === selectedCouncilId)?.TEN_HOIDONG || 'N/A'}</strong> không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove}>Xác nhận</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeDialogState.isOpen} onOpenChange={open => !open && setRemoveDialogState({ isOpen: false, groupId: null, councilId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Xác nhận Gỡ nhóm
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn gỡ nhóm này khỏi hội đồng không? Nhóm sẽ trở về trạng thái chưa phân bổ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Gỡ bỏ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAutoAssignDialogOpen} onOpenChange={setIsAutoAssignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Xác nhận Phân bổ Tự động?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                Hệ thống sẽ tự động phân bổ <strong>{unassignedGroupsCount} nhóm</strong> chưa có hội đồng vào các hội đồng phù hợp nhất trong kế hoạch <strong>{currentPlan?.TEN_DOT}</strong>.
                <br /><br />
                <div className="mb-4 p-3 bg-muted/50 rounded-md border">
                  <Label className="mb-2 block text-xs font-bold uppercase">Chọn loại hội đồng đích:</Label>
                  <RadioGroup value={autoAssignType} onValueChange={setAutoAssignType} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hoidong" id="opt-hd" />
                      <Label htmlFor="opt-hd" className="cursor-pointer">Hội đồng Bảo vệ</Label>
                    </div>
                    {/* [UPDATED] Thêm tùy chọn Hội đồng 5 người */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hoidong5" id="opt-hd5" />
                      <Label htmlFor="opt-hd5" className="cursor-pointer">Hội đồng Bảo vệ (5 người)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phanbien" id="opt-pb" />
                      <Label htmlFor="opt-pb" className="cursor-pointer">Phản biện</Label>
                    </div>
                  </RadioGroup>
                </div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Ưu tiên gán vào Hội đồng có cùng chuyên ngành/bộ môn.</li>
                  <li>Cân bằng số lượng nhóm giữa các hội đồng.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAutoAssign} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tiến hành phân bổ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PhanboHoiDong;