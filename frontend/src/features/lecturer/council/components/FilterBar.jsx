import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Layers, X } from "lucide-react"; // [SỬA] Dùng icon Layers thay GraduationCap
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const FilterBar = ({
  searchTerm, setSearchTerm,
  filter, setFilter,
  kehoach, bomon, // [SỬA] Props bomon
  handleReset
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between">
      <div className="relative w-full md:w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm tên hội đồng..."
          className="pl-9 bg-background"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2 flex-1 justify-end">
        <Select
          value={filter.kehoach}
          onValueChange={(value) => setFilter({ ...filter, kehoach: value === "all" ? "" : value })}
        >
          <SelectTrigger className="w-[220px] bg-background">
            <div className="flex items-center gap-2 truncate">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Tất cả kế hoạch" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kế hoạch</SelectItem>
            {kehoach.map((k) => (
              <SelectItem key={k.ID_KEHOACH} value={String(k.ID_KEHOACH)}>
                {k.TEN_DOT}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* [SỬA] Select cho Bộ môn */}
        <Select
          value={filter.bomon}
          onValueChange={(value) => setFilter({ ...filter, bomon: value === "all" ? "" : value })}
        >
          <SelectTrigger className="w-[200px] bg-background">
            <div className="flex items-center gap-2 truncate">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Tất cả bộ môn" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả bộ môn</SelectItem>
            {bomon.map((bm) => (
              <SelectItem key={bm.ID_KHOA_BOMON} value={String(bm.ID_KHOA_BOMON)}>
                {bm.TEN_KHOA_BOMON}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filter.kehoach || filter.bomon || searchTerm) && (
          <Button variant="ghost" size="icon" onClick={handleReset} title="Xóa bộ lọc">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;