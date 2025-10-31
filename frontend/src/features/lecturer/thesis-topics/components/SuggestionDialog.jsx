import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const SuggestionDialog = ({ open, onOpenChange, onSubmit, topic }) => {
    const [suggestion, setSuggestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        const trimmedSuggestion = suggestion.trim();

        if (!trimmedSuggestion) {
            setError('Vui lòng nhập nội dung góp ý');
            return;
        }

        if (trimmedSuggestion.length < 10) {
            setError('Nội dung góp ý phải có ít nhất 10 ký tự');
            return;
        }

        if (trimmedSuggestion.length > 1000) {
            setError('Nội dung góp ý không được vượt quá 1000 ký tự');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onSubmit(trimmedSuggestion);
            setSuggestion('');
            onOpenChange(false);
        } catch (error) {
            console.error('Error submitting suggestion:', error);
            // Error handling is done in parent component
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open) => {
        if (!open) {
            setSuggestion('');
            setError('');
        }
        onOpenChange(open);
    };

    const handleSuggestionChange = (e) => {
        setSuggestion(e.target.value);
        if (error) setError('');
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Góp ý đề tài</DialogTitle>
                    <DialogDescription>
                        Góp ý cho đề tài "{topic?.TEN_DETAI}"
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="suggestion">
                            Nội dung góp ý <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="suggestion"
                            placeholder="Nhập góp ý của bạn (tối thiểu 10 ký tự, tối đa 1000 ký tự)..."
                            value={suggestion}
                            onChange={handleSuggestionChange}
                            rows={6}
                            className={error ? 'border-red-500' : ''}
                        />
                        <div className="text-xs text-gray-500 text-right">
                            {suggestion.length}/1000 ký tự
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={!suggestion.trim() || loading}>
                        {loading ? 'Đang gửi...' : 'Gửi góp ý'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SuggestionDialog;