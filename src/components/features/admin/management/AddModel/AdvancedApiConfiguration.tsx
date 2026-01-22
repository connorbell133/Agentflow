import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AdvancedApiConfigurationProps {
    schemaValidated: boolean;
    validationResult: string;
    builtSamplePayload: string;
    response: string;
    responseStatus: string;
    response_path: string;
    onresponse_pathChange: (value: string) => void;
    responseValue: string;
    responseError: string;
    onTestEndpoint: () => void;
    onGetValue: () => void;
}

const AdvancedApiConfiguration: React.FC<AdvancedApiConfigurationProps> = ({
    schemaValidated,
    validationResult,
    builtSamplePayload,
    response,
    responseStatus,
    response_path,
    onresponse_pathChange,
    responseValue,
    responseError,
    onTestEndpoint,
    onGetValue,
}) => {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        preview: true,
        test: false,
        output: false,
    });

    const toggleSection = (section: string) => {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const isPreviewComplete = !!schemaValidated;
    const isTestComplete = typeof responseStatus === "string" && responseStatus.startsWith('2');
    const isOutputComplete = !!responseValue;

    return (
        <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6">
            <div className="relative space-y-4">
                <div
                    className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-0.5 bg-zinc-200 dark:bg-zinc-700"
                    aria-hidden="true"
                />

                {/* === STEP 1: SCHEMA & PAYLOAD PREVIEW === */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => toggleSection("preview")}
                        aria-expanded={openSections.preview}
                        aria-controls="preview-content"
                        className="flex w-full items-center gap-4 text-left"
                    >
                        <div className={`z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white  ${openSections.preview ? "bg-indigo-600" : "bg-zinc-400 dark:bg-zinc-600"}`}>
                            1
                        </div>
                        <h2 className="flex-grow text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                            Preview & Validate Schema
                        </h2>
                        {isPreviewComplete && (
                            <svg
                                className="h-6 w-6 flex-shrink-0 text-green-600"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        )}
                        <svg
                            className={`h-6 w-6 flex-shrink-0 text-zinc-500 transition-transform duration-300 ${openSections.preview ? "rotate-180" : ""}`}
                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>
                    <div id="preview-content" className={`overflow-hidden transition-all duration-500 ease-in-out ${openSections.preview ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
                        <div className="ml-5 mt-4 space-y-6 rounded-xl border border-zinc-200 bg-card p-6 shadow-sm dark:border-zinc-800 pl-9">
                            <Card className="bg-card border-border lg:sticky lg:top-20 h-fit">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Preview & Validation</CardTitle>
                                    <CardDescription>Preview the resolved payload and schema validation.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-gray-700 dark:text-zinc-300 font-semibold">Sample Payload</label>
                                            <div className="flex items-center gap-2 text-xs">
                                                {schemaValidated ? (
                                                    <span className="inline-flex items-center gap-1 text-green-500"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> Valid</span>
                                                ) : (
                                                    <details>
                                                        <summary className="list-none cursor-pointer inline-flex items-center gap-1 text-red-500">
                                                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> Errors
                                                        </summary>
                                                        <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border p-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20">{validationResult}</pre>
                                                    </details>
                                                )}
                                            </div>
                                        </div>
                                        <textarea
                                            readOnly
                                            className={`rounded w-full px-3 py-2 font-mono text-sm h-52 resize-none focus:outline-none focus:ring-1 ${schemaValidated ? "border-green-500" : "border"} bg-card text-card-foreground`}
                                            value={builtSamplePayload}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Generated from template and variables.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* === STEP 2: TEST ENDPOINT === */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => toggleSection("test")}
                        aria-expanded={openSections.test}
                        aria-controls="test-content"
                        className="flex w-full items-center gap-4 text-left"
                    >
                        <div className={`z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white  ${openSections.test ? "bg-indigo-600" : "bg-zinc-400 dark:bg-zinc-600"}`}>
                            2
                        </div>
                        <h2 className="flex-grow text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                            Test Endpoint
                        </h2>
                        {isTestComplete && (
                            <svg
                                className="h-6 w-6 flex-shrink-0 text-green-600"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        )}
                        <svg
                            className={`h-6 w-6 flex-shrink-0 text-zinc-500 transition-transform duration-300 ${openSections.test ? "rotate-180" : ""}`}
                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>
                    <div id="test-content" className={`overflow-hidden transition-all duration-500 ease-in-out ${openSections.test ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
                        <div className="ml-5 mt-4 space-y-6 rounded-xl border border-zinc-200 bg-card p-6 shadow-sm dark:border-zinc-800 pl-9">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Click <strong>Test Endpoint</strong> to validate the model’s API behavior. Check the response before finalizing.
                            </p>
                            <div>
                                <label htmlFor="response" className="flex items-center gap-2 mb-2 font-medium text-zinc-800 dark:text-zinc-100">
                                    API Response
                                    {responseStatus && (
                                        <span
                                            className={`rounded-md px-2 py-0.5 text-xs font-bold ${responseStatus === "200"
                                                ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                                                : responseStatus === "Fetching..."
                                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                                                    : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                                                }`}
                                        >
                                            {responseStatus}
                                        </span>
                                    )}
                                </label>
                                <textarea
                                    id="response"
                                    readOnly
                                    className="border rounded w-full px-3 py-2 font-mono text-sm h-32 resize-none bg-card text-card-foreground focus:outline-none focus:ring-1"
                                    value={response}
                                    placeholder="API response will appear here..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* === STEP 3: CHOOSE OUTPUT === */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => toggleSection("output")}
                        aria-expanded={openSections.output}
                        aria-controls="output-content"
                        className="flex w-full items-center gap-4 text-left"
                    >
                        <div className={`z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white  ${openSections.output ? "bg-indigo-600" : "bg-zinc-400 dark:bg-zinc-600"}`}>
                            3
                        </div>
                        <h2 className="flex-grow text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                            Choose Output
                        </h2>
                        {isOutputComplete && (
                            <svg
                                className="h-6 w-6 flex-shrink-0 text-green-600"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        )}
                        <svg
                            className={`h-6 w-6 flex-shrink-0 text-zinc-500 transition-transform duration-300 ${openSections.output ? "rotate-180" : ""}`}
                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>
                    <div id="output-content" className={`overflow-hidden transition-all duration-500 ease-in-out ${openSections.output ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
                        <div className="ml-5 mt-4 space-y-8 rounded-xl border border-zinc-200 bg-card p-6 shadow-sm dark:border-zinc-800 pl-9">
                            <div>
                                <label htmlFor="response_path" className="block text-gray-700 dark:text-zinc-300 font-semibold mb-1">
                                    Response Path
                                </label>
                                <p className="text-gray-600 dark:text-zinc-400 text-sm mb-4">
                                    Enter a dot/bracket path to retrieve a specific value from the JSON response. (Example: <code>[0].content</code>)
                                </p>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="response_path"
                                        type="text"
                                        className="flex-grow bg-card text-card-foreground"
                                        placeholder="e.g. data[0].user.name"
                                        value={response_path}
                                        onChange={(e) => onresponse_pathChange(e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        onClick={onGetValue}
                                    >
                                        Get Value
                                    </Button>
                                </div>
                                {responseError && (
                                    <p className="text-red-600 mt-2 text-sm">{responseError}</p>
                                )}
                                {responseValue && (
                                    <div className="mt-4">
                                        <label className="block text-gray-700 dark:text-zinc-300 font-semibold mb-1">
                                            Extracted Value
                                        </label>
                                        <textarea
                                            readOnly
                                            className="border rounded w-full px-3 py-2 font-mono text-sm h-32 resize-none bg-card text-card-foreground focus:outline-none focus:ring-1"
                                            value={responseValue}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedApiConfiguration;


