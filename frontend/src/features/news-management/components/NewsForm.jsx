import React, { useState, useEffect, useRef } from "react";
import axios from "../../../api/axiosConfig";
import { XCircle, FileText, Trash2, Loader2, ImagePlus, Upload, X, ShieldAlert } from "lucide-react";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge"; // <-- SỬA LỖI: THÊM DÒNG NÀY

const NewsForm = ({ news, onSuccess, onCancel }) => {
    const [form, setForm] = useState({
        title: "",
        category: "",
        pdf_file: null,
        cover_image: null,
        cover_preview: null,
        blocks: [], // [{ id, type: "text"|"image", content?, file?, preview?, originalUrl?, deleted? }]
    });
    const [fileName, setFileName] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const titleRef = useRef(null);

    // Ref cho các input file
    const pdfInputRef = useRef(null);
    const coverInputRef = useRef(null);

    /* ========================================================
     * LẤY DỮ LIỆU CŨ (NẾU CÓ)
     * ====================================================== */
    useEffect(() => {
        if (news) {
            const blocks = [];
            // Đảm bảo chỉ có 1 text block, gộp tất cả nội dung lại
            if (news.content) {
                blocks.push({ id: Date.now() + Math.random(), type: "text", content: news.content });
            }

            if (Array.isArray(news.images)) {
                news.images.forEach((imgUrl, index) => {
                    // Không thêm ảnh bìa vào danh sách ảnh phụ
                    if (imgUrl !== news.cover_image_url) {
                        blocks.push({ id: Date.now() + Math.random() + index, type: "image", preview: imgUrl, file: null, originalUrl: imgUrl });
                    }
                });
            }

            // Nếu không có text block nào, thêm một block trống
            if (blocks.filter(b => b.type === 'text').length === 0) {
                 blocks.unshift({ id: Date.now() + Math.random(), type: "text", content: "" });
            }

            setForm({
                title: news.title || "",
                category: news.category || "",
                pdf_file: null,
                cover_image: null,
                cover_preview: news.cover_image_url || null,
                blocks,
            });
            setFileName(news.pdf_url ? news.pdf_url.split("/").pop() : "");
        } else {
            // Mặc định khi tạo mới là 1 text block
            setForm({ title: "", category: "", pdf_file: null, cover_image: null, cover_preview: null, blocks: [{ id: Date.now(), type: "text", content: "" }] });
            setFileName("");
        }

        setErrorMessage("");
        setTimeout(() => titleRef.current?.focus(), 0);
    }, [news]);

    /* ========================================================
     * XỬ LÝ FILE PDF VÀ ẢNH BÌA
     * ====================================================== */
    const handlePdfChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                setErrorMessage("Chỉ được tải lên file PDF!");
                e.target.value = null;
                return;
            }
            setForm({ ...form, pdf_file: file });
            setFileName(file.name);
            setErrorMessage("");
        }
    };

    const handleCoverImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setErrorMessage("Chỉ được tải lên file ảnh!");
                e.target.value = null;
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, cover_image: file, cover_preview: reader.result });
            };
            reader.readAsDataURL(file);
            setErrorMessage("");
        }
    };

    const removePdf = () => {
        setForm({ ...form, pdf_file: null });
        setFileName("");
        if (pdfInputRef.current) pdfInputRef.current.value = null;
    };

    const removeCoverImage = () => {
        setForm({ ...form, cover_image: null, cover_preview: null });
         if (coverInputRef.current) coverInputRef.current.value = null;
    };

    /* ========================================================
     * XỬ LÝ BLOCK NỘI DUNG
     * ====================================================== */
    const addTextBlock = () =>
        setForm({ ...form, blocks: [...form.blocks, { id: Date.now(), type: "text", content: "" }] });

    const addImageBlock = () =>
        setForm({ ...form, blocks: [...form.blocks, { id: Date.now(), type: "image", file: null, preview: null }] });

    const updateBlock = (idx, value) => {
        const newBlocks = [...form.blocks];
        if (newBlocks[idx] && newBlocks[idx].type === "text") {
            newBlocks[idx].content = value;
            setForm({ ...form, blocks: newBlocks });
        }
    };

    const removeBlock = (idToRemove) => {
        // Không cho xóa text block cuối cùng
        const textBlocks = form.blocks.filter(b => b.type === 'text');
        const blockToRemove = form.blocks.find(b => b.id === idToRemove);
        
        if (textBlocks.length === 1 && blockToRemove?.type === 'text') {
            toast.error("Không thể xóa khối nội dung cuối cùng.");
            return;
        }

        const newBlocks = form.blocks.filter((b) => b.id !== idToRemove);
        setForm({ ...form, blocks: newBlocks });
    };


    const handleImageChangeBlock = (e, idx) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith("image/")) {
            toast.error("Vui lòng chỉ chọn file ảnh.");
            e.target.value = null;
            return;
        }

        const newBlocks = [...form.blocks];
        if (newBlocks[idx] && newBlocks[idx].type === "image") {
            const reader = new FileReader();
            reader.onloadend = () => {
                newBlocks[idx].file = file;
                newBlocks[idx].preview = reader.result;
                newBlocks[idx].originalUrl = undefined; // Clear original URL if a new file is uploaded
                setForm(prevForm => ({ ...prevForm, blocks: newBlocks }));
            };
            reader.readAsDataURL(file);
        }
    };

    /* ========================================================
     * SUBMIT FORM
     * ====================================================== */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.title.trim()) {
            setErrorMessage("Vui lòng nhập tiêu đề!");
            titleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            titleRef.current?.focus();
            return;
        }

        const textContent = form.blocks
            .filter((b) => b.type === "text")
            .map((b) => b.content || "")
            .join("\n\n").trim(); // Gộp tất cả text block lại

        if (!textContent) {
             setErrorMessage("Vui lòng nhập nội dung!");
             const firstTextArea = document.querySelector('textarea');
             firstTextArea?.focus();
             firstTextArea?.scrollIntoView({ behavior: "smooth", block: "center" });
             return;
        }

        setLoading(true);
        setErrorMessage("");

        const formData = new FormData();
        formData.append("title", form.title.trim());
        formData.append("category", form.category);
        formData.append("content", textContent); // Gửi nội dung đã gộp

        if (form.pdf_file) {
            formData.append("pdf_file", form.pdf_file);
        } else if (news && news.pdf_url && fileName === "") {
            formData.append("remove_pdf", "1");
        }

        if (form.cover_image) {
            formData.append("cover_image", form.cover_image);
        } else if (news && news.cover_image_url && !form.cover_preview) {
            formData.append("remove_cover_image", "1");
        }

        let imageIndex = 0;
        form.blocks.forEach((block) => {
            if (block.type === "image" && block.file) {
                formData.append(`images[${imageIndex++}]`, block.file);
            }
        });

        // Xác định ảnh đã bị xóa
        const existingImageUrlsInForm = new Set(
            form.blocks
                .filter(b => b.type === 'image' && b.originalUrl)
                .map(b => b.originalUrl)
        );
        const deletedImageOriginalUrls = (news?.images || [])
            .filter(originalUrl => !existingImageUrlsInForm.has(originalUrl) && originalUrl !== news?.cover_image_url);

        deletedImageOriginalUrls.forEach((url, index) => {
            try {
                // Lấy phần path sau /storage/
                const pathname = new URL(url).pathname;
                const storagePath = pathname.substring(pathname.indexOf('/storage/') + 1); // Bắt đầu từ 'storage/...'
                formData.append(`deleted_images[${index}]`, storagePath);
            } catch (e) {
                 console.warn("Could not parse URL to get deleted path:", url);
            }
        });


        try {
            const config = {
                headers: { "Content-Type": "multipart/form-data", Accept: "application/json" },
            };

            if (news?.id) {
                formData.append("_method", "POST"); // Dùng POST để spoof PUT/PATCH
                await axios.post(`/news/${news.id}`, formData, config);
                toast.success("Cập nhật tin tức thành công!");
            } else {
                await axios.post("/news", formData, config);
                toast.success("Tạo tin tức mới thành công!");
            }

            onSuccess?.(); // Gọi callback thành công
        } catch (err) {
            console.error("Submit Error:", err);
            if (err.response && err.response.status === 422 && err.response.data.errors) {
                const firstErrorKey = Object.keys(err.response.data.errors)[0];
                const firstErrorMessage = err.response.data.errors[firstErrorKey][0];
                setErrorMessage(firstErrorMessage || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.");
                const errorFieldElement = document.querySelector(`[name="${firstErrorKey}"]`);
                errorFieldElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                errorFieldElement?.focus();
            } else {
                setErrorMessage(err.response?.data?.message || err.response?.data?.error || err.message || "Có lỗi xảy ra!");
            }
        } finally {
            setLoading(false);
        }
    };

    /* ========================================================
     * GIAO DIỆN FORM
     * ====================================================== */
    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6" // Bỏ card bên ngoài vì đã có ở component cha
        >
            {errorMessage && (
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            {/* Thông tin chung */}
            <Card>
                <CardHeader>
                    <CardTitle>Thông tin chung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="news-title" className="text-base">Tiêu đề *</Label>
                        <Input
                            id="news-title"
                            ref={titleRef}
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Nhập tiêu đề tin tức..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="news-category" className="text-base">Phân loại</Label>
                        <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                            <SelectTrigger id="news-category">
                                <SelectValue placeholder="Chọn phân loại" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="THÔNG BÁO GIÁO VỤ">THÔNG BÁO GIÁO VỤ</SelectItem>
                                <SelectItem value="THÔNG BÁO MÔN HỌC">THÔNG BÁO MÔN HỌC</SelectItem>
                                <SelectItem value="THÔNG BÁO HỌC BỔNG">THÔNG BÁO HỌC BỔNG</SelectItem>
                                <SelectItem value="THÔNG BÁO ĐỒ ÁN, KHÓA LUẬN">THÔNG BÁO ĐỒ ÁN, KHÓA LUẬN</SelectItem>
                                <SelectItem value="THÔNG BÁO ĐÀO TẠO NGẮN HẠN">THÔNG BÁO ĐÀO TẠO NGẮN HẠN</SelectItem>
                                <SelectItem value="TIN TỨC">TIN TỨC</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Files đính kèm */}
            <Card>
                <CardHeader>
                    <CardTitle>Tài liệu đính kèm (Tùy chọn)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* File PDF */}
                    <div className="space-y-2">
                        <Label className="text-base">File PDF</Label>
                        <div className="flex items-center gap-3 flex-wrap">
                            <Input
                                type="file"
                                id="pdf-upload"
                                accept="application/pdf"
                                onChange={handlePdfChange}
                                className="hidden"
                                ref={pdfInputRef}
                            />
                            <Button asChild variant="outline">
                                <Label htmlFor="pdf-upload" className="cursor-pointer">
                                    <Upload className="mr-2 h-4 w-4" /> Chọn file PDF...
                                </Label>
                            </Button>
                            {fileName && (
                                <Badge variant="secondary" className="p-2 gap-1.5">
                                    <FileText className="h-4 w-4 text-destructive" />
                                    <span className="truncate max-w-[150px]">{fileName}</span>
                                    <button type="button" onClick={removePdf} className="ml-1 text-muted-foreground hover:text-destructive">
                                        <X className="h-4 w-4" />
                                    </button>
                                </Badge>
                            )}
                        </div>
                    </div>
                     {/* Ảnh bìa */}
                    <div className="space-y-2">
                        <Label className="text-base">Ảnh bìa</Label>
                        <div className="flex items-center gap-3 flex-wrap">
                            <Input
                                type="file"
                                id="cover-upload"
                                accept="image/*"
                                onChange={handleCoverImageChange}
                                className="hidden"
                                ref={coverInputRef}
                            />
                            <Button asChild variant="outline">
                                <Label htmlFor="cover-upload" className="cursor-pointer">
                                    <ImagePlus className="mr-2 h-4 w-4" /> Chọn ảnh bìa...
                                </Label>
                            </Button>
                            {form.cover_preview && (
                                <div className="relative group">
                                    <img src={form.cover_preview} alt="Cover Preview" className="h-16 w-auto object-cover rounded-md shadow-sm border" />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={removeCoverImage}
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Xóa ảnh bìa"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Nội dung bài viết */}
            <Card>
                <CardHeader>
                    <CardTitle>Nội dung bài viết *</CardTitle>
                    <CardDescription>Thêm các khối nội dung và hình ảnh cho bài viết của bạn.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {form.blocks.map((block, idx) => (
                        <div key={block.id || idx} className="border p-4 rounded-lg relative group bg-background">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBlock(block.id)}
                                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Xóa khối này"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>

                            {block.type === "text" && (
                                <div className="space-y-2">
                                     <Label htmlFor={`text-block-${idx}`}>Nội dung văn bản</Label>
                                    <Textarea
                                        id={`text-block-${idx}`}
                                        value={block.content || ""}
                                        onChange={(e) => updateBlock(idx, e.target.value)}
                                        placeholder="Nhập nội dung..."
                                        className="w-full min-h-[120px] resize-y"
                                    />
                                </div>
                            )}

                            {block.type === "image" && (
                                <div className="space-y-3">
                                    <Label htmlFor={`image-upload-${idx}`}>Hình ảnh</Label>
                                    <Input
                                        type="file"
                                        id={`image-upload-${idx}`}
                                        accept="image/*"
                                        onChange={(e) => handleImageChangeBlock(e, idx)}
                                        className="text-sm"
                                    />
                                    {block.preview && (
                                        <div className="mt-2">
                                            <img
                                                src={block.preview}
                                                alt="preview"
                                                className="w-full max-w-sm h-auto object-contain rounded-md shadow-md border"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    <Separator />
                    <div className="flex gap-4">
                        <Button type="button" variant="secondary" onClick={addTextBlock}>
                            Thêm Nội dung
                        </Button>
                        <Button type="button" variant="secondary" onClick={addImageBlock}>
                            Thêm Ảnh
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Nút hành động */}
            <div className="flex gap-4 pt-6 justify-end border-t">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                >
                    Hủy
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="min-w-[120px]"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Đang lưu...
                        </>
                    ) : (news?.id ? "Cập nhật" : "Thêm mới")}
                </Button>
            </div>
        </form>
    );
};

export default NewsForm;