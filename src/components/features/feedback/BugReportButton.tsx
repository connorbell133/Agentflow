'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bug, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';

export function BugReportButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'bug' as 'bug' | 'feature' | 'other',
        priority: 'medium' as 'low' | 'medium' | 'high',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/bug-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    path: pathname || 'unknown',
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showToast('Report submitted successfully. Thank you for your feedback!', 'success');
                setOpen(false);
                setFormData({
                    title: '',
                    description: '',
                    type: 'bug',
                    priority: 'medium',
                });
            } else {
                throw new Error(result.error || 'Failed to submit report');
            }
        } catch (error) {
            console.error('Bug report error:', error);
            showToast(error instanceof Error ? error.message : 'Failed to submit report. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg h-12 w-12 p-0"
                    variant="default"
                    size="icon"
                >
                    <Bug className="h-6 w-6" />
                    <span className="sr-only">Report Bug</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Report a Bug</DialogTitle>
                    <DialogDescription>
                        Found an issue or have a suggestion? Let us know!
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData({ ...formData, title: e.target.value })
                            }
                            placeholder="Brief summary of the issue"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value: 'bug' | 'feature' | 'other') =>
                                setFormData({ ...formData, type: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bug">Bug Report</SelectItem>
                                <SelectItem value="feature">Feature Request</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                            value={formData.priority}
                            onValueChange={(value: 'low' | 'medium' | 'high') =>
                                setFormData({ ...formData, priority: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="Please describe what happened..."
                            className="min-h-[100px]"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Report
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
