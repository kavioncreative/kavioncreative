import { supabase } from '../lib/supabase';

export interface WebhookPayload {
    event: 'projectCreated' | 'statusChanged' | 'commentAdded' | 'fileUploaded';
    data: any;
    timestamp: string;
}

export async function triggerWebhooks(event: WebhookPayload['event'], data: any) {
    try {
        // 1. Fetch active webhooks for this event
        const { data: webhooks, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('is_active', true);

        if (error || !webhooks) {
            console.error('Error fetching webhooks:', error);
            return;
        }

        // Filter webhooks that have the event enabled in their JSONB 'events' column
        const activeWebhooks = webhooks.filter(w => w && w.events && w.events[event] === true);

        if (activeWebhooks.length === 0) {
            return;
        }

        const payload: WebhookPayload = {
            event,
            data,
            timestamp: new Date().toISOString()
        };

        // 2. Trigger each webhook
        const promises = activeWebhooks.map(async (webhook) => {
            try {
                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Secret': webhook.secret || '',
                        'X-CodesLogic-Event': event
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    // Update success count using the RPC function from SQL
                    await supabase.rpc('increment_webhook_success', { webhook_id: webhook.id });
                } else {
                    console.error(`Webhook ${webhook.name} failed with status: ${response.status}`);
                    await supabase.rpc('increment_webhook_failure', { webhook_id: webhook.id });
                }
            } catch (err) {
                console.error(`Error triggering webhook ${webhook.name}:`, err);
                await supabase.rpc('increment_webhook_failure', { webhook_id: webhook.id });
            }
        });

        await Promise.all(promises);
    } catch (err) {
        console.error('Failed to trigger webhooks:', err);
    }
}
