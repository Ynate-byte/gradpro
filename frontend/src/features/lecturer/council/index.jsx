import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import axiosClient from "@/api/axiosConfig";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CouncilDetailDialog from "./components/CouncilDetailDialog";
import CouncilTable from "./components/CouncilTable";
import FilterBar from "./components/FilterBar";

const ListHoiDong = () => {
  const { user } = useAuth();
  const [hoidong, setHoidong] = useState([]);
  const [kehoach, setKehoach] = useState([]);
  const [chuyennganh, setChuyennganh] = useState([]);
  
  const [filter, setFilter] = useState({ kehoach: "", chuyennganh: "" });
  const [searchTerm, setSearchTerm] = useState("");
  
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const rowsPerPage = 10;

  const [selectedCouncilId, setSelectedCouncilId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [hdRes, khRes, cnRes] = await Promise.all([
        axiosClient.get("/giangvien/my-hoidong"),
        axiosClient.get("/admin/hoidong/kehoach-options"),
        axiosClient.get("/admin/hoidong/chuyennganh-options"),
      ]);
      
      setHoidong(hdRes.data || []);
      setKehoach(khRes.data || []);
      setChuyennganh(cnRes.data || []);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
      toast.error("Không thể tải dữ liệu từ máy chủ!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filter, searchTerm]);

  const filteredHoiDong = useMemo(() => {
    return hoidong.filter((h) => {
      const matchKeHoach = !filter.kehoach || String(h.ID_KEHOACH) === String(filter.kehoach);
      const matchChuyenNganh = !filter.chuyennganh || String(h.ID_CHUYENNGANH) === String(filter.chuyennganh);
      const matchSearch = !searchTerm || h.TEN_HOIDONG.toLowerCase().includes(searchTerm.toLowerCase());
      return matchKeHoach && matchChuyenNganh && matchSearch;
    });
  }, [hoidong, filter, searchTerm]);

  const totalPages = Math.ceil(filteredHoiDong.length / rowsPerPage);
  const paginatedHoiDong = filteredHoiDong.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleReset = () => {
    setFilter({ kehoach: "", chuyennganh: "" });
    setSearchTerm("");
  };

  const handleViewDetail = (id) => {
    setSelectedCouncilId(id);
    setIsDetailOpen(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  };

  if (loading)
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
        <p>Đang tải dữ liệu hội đồng...</p>
      </div>
    );

  return (
    <motion.div 
        className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3 border-b bg-muted/5">
          <FilterBar 
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            filter={filter} setFilter={setFilter}
            kehoach={kehoach} chuyennganh={chuyennganh}
            handleReset={handleReset}
          />
        </CardHeader>

        <CardContent className="p-0">
          <CouncilTable 
            data={paginatedHoiDong} 
            onViewDetail={handleViewDetail} 
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Trước
              </Button>
              <div className="text-sm font-medium">
                Trang {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
              >
                Tiếp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CouncilDetailDialog 
        councilId={selectedCouncilId} 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />
    </motion.div>
  );
};

export default ListHoiDong;