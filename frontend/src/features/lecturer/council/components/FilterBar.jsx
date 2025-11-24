import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Calendar, GraduationCap, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const FilterBar = ({
  searchTerm, setSearchTerm,
  filter, setFilter,
  kehoach, chuyennganh,
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

        <Select
          value={filter.chuyennganh}
          onValueChange={(value) => setFilter({ ...filter, chuyennganh: value === "all" ? "" : value })}
        >
          <SelectTrigger className="w-[200px] bg-background">
            <div className="flex items-center gap-2 truncate">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Tất cả chuyên ngành" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
            {chuyennganh.map((c) => (
              <SelectItem key={c.ID_CHUYENNGANH} value={String(c.ID_CHUYENNGANH)}>
                {c.TEN_CHUYENNGANH}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filter.kehoach || filter.chuyennganh || searchTerm) && (
          <Button variant="ghost" size="icon" onClick={handleReset} title="Xóa bộ lọc">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;