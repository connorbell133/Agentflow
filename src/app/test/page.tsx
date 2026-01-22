"use client";
import React from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ModelCard from "@/components/features/admin/management/ModelCard";

export default function ChatUI() {
    const models = [
        {
            id: "1",
            name: "Product Designer",
            description: "Choose any number of unique representatives and include them in your personalized labor force.",
            avatar: "",
            status: "online" as const,
            tags: ["Design", "UI/UX", "Creative"],
            modelType: "Design Agent",
        },
        {
            id: "2",
            name: "Blockchain Developer",
            description: "Expert in smart contracts, DeFi protocols, and Web3 development with deep knowledge of Ethereum ecosystem.",
            avatar: "",
            status: "pending" as const,
            tags: ["Blockchain", "Web3", "Smart Contracts"],
            modelType: "Development Agent",
        },
        {
            id: "3",
            name: "Marketing Specialist",
            description: "Browse and deploy curated by our community specialists for targeted marketing campaigns and growth strategies.",
            avatar: "",
            status: "offline" as const,
            tags: ["Marketing", "Growth", "Analytics"],
            modelType: "Marketing Agent",
        },
        {
            id: "4",
            name: "Business Developer",
            description: "Strategic business development and partnership opportunities with comprehensive market analysis.",
            avatar: "",
            status: "online" as const,
            tags: ["Business", "Strategy", "Partnerships"],
            modelType: "Business Agent",
        },
        {
            id: "5",
            name: "Talent Recruiter",
            description: "AI-powered talent acquisition and HR management with advanced candidate screening capabilities.",
            avatar: "",
            status: "online" as const,
            tags: ["HR", "Recruiting", "Talent"],
            modelType: "HR Agent",
        },
    ];

    return (
        <ThemeProvider>
            <div className="min-h-screen bg-background p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground mb-4">Singular AI Wizards</h1>
                        <p className="text-muted-foreground text-lg">
                            Choose any number of unique representatives and include them in your personalized labor force.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {models.map((model) => (
                            <ModelCard
                                key={model.id}
                                id={model.id}
                                name={model.name}
                                description={model.description}
                                avatar={model.avatar}
                                status={model.status}
                                tags={model.tags}
                                modelType={model.modelType}
                                onClick={() => console.log(`Clicked on ${model.name}`)}
                                onEdit={() => console.log(`Edit ${model.name}`)}
                                onDelete={() => console.log(`Delete ${model.name}`)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
}
