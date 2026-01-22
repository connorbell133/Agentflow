"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

interface OrganizationCreatedModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgName: string;
}

export function OrganizationCreatedModal({ isOpen, onClose, orgName }: OrganizationCreatedModalProps) {
    const router = useRouter();

    const handleGoToChat = () => {
        router.push("/");
        onClose();
    };

    const handleStayInAdmin = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center pb-4">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-10 h-10 text-green-600 dark:text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6"
                            />
                        </svg>
                    </div>

                    <Badge variant="outline" className="text-green-600 mb-2 mx-auto">
                        🎉 Organization Created
                    </Badge>

                    <DialogTitle className="text-2xl font-bold">
                        Welcome to &quot;{orgName}&quot;!
                    </DialogTitle>

                    <DialogDescription>
                        Congratulations! Your organization has been successfully created.
                        You are now the administrator and can start building your team.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="bg-muted/50 p-4 rounded-lg border">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center">
                            <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            What&apos;s Next?
                        </h4>
                        <div className="text-sm text-muted-foreground space-y-2">
                            <div className="flex items-start space-x-2">
                                <span className="text-green-500 font-bold">•</span>
                                <span>Invite team members to collaborate</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-500 font-bold">•</span>
                                <span>Configure AI models and permissions</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-500 font-bold">•</span>
                                <span>Set up groups and access controls</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <span className="text-green-500 font-bold">•</span>
                                <span>Start chatting with your team</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={handleGoToChat}
                            className="w-full"
                            size="lg"
                        >
                            🚀 Start Chatting
                        </Button>

                        <Button
                            onClick={handleStayInAdmin}
                            variant="outline"
                            className="w-full"
                            size="lg"
                        >
                            ⚙️ Continue Managing Organization
                        </Button>
                    </div>

                    <Separator />

                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                            You can access organization settings anytime from the admin panel
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
