import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await req.json();
        const webhookUrl = process.env.BUG_REPORT_WEBHOOK_URL;

        const payload = {
            ...data,
            userId,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
        };

        if (webhookUrl) {
            console.log(`Attempting to send bug report to webhook: ${webhookUrl}`);

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                console.error(`Webhook failed with status ${response.status}: ${errorText}`);
                throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
            }
        } else {
            // Fallback for development/beta without webhook
            console.log('Bug Report Submitted (No Webhook URL configured):', payload);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error submitting bug report:', error);
        // Return the specific error message for debugging
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to submit bug report' },
            { status: 500 }
        );
    }
}
