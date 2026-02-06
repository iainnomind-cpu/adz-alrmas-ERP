import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders,
        });
    }

    try {
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const results = {
            birthdays: 0,
            annualFees: 0,
            paymentReminders: 0,
            errors: [] as string[],
        };

        console.log('Starting automatic notification processing...');

        // 1. Process Birthday Notifications
        try {
            const birthdayCount = await processBirthdayNotifications(supabase);
            results.birthdays = birthdayCount;
            console.log(`Processed ${birthdayCount} birthday notifications`);
        } catch (error) {
            const errorMsg = `Birthday notifications error: ${error instanceof Error ? error.message : 'Unknown'}`;
            console.error(errorMsg);
            results.errors.push(errorMsg);
        }

        // 2. Process Annual Fee Notifications
        try {
            const annualFeeCount = await processAnnualFeeNotifications(supabase);
            results.annualFees = annualFeeCount;
            console.log(`Processed ${annualFeeCount} annual fee notifications`);
        } catch (error) {
            const errorMsg = `Annual fee notifications error: ${error instanceof Error ? error.message : 'Unknown'}`;
            console.error(errorMsg);
            results.errors.push(errorMsg);
        }

        // 3. Process Payment Reminder Notifications
        try {
            const paymentCount = await processPaymentReminderNotifications(supabase);
            results.paymentReminders = paymentCount;
            console.log(`Processed ${paymentCount} payment reminder notifications`);
        } catch (error) {
            const errorMsg = `Payment reminder notifications error: ${error instanceof Error ? error.message : 'Unknown'}`;
            console.error(errorMsg);
            results.errors.push(errorMsg);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Automatic notifications processed',
                results,
            }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (error) {
        console.error('Error in process-automatic-notifications function:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            }
        );
    }
});

// Process birthday notifications
async function processBirthdayNotifications(supabase: any): Promise<number> {
    console.log('Starting birthday notification processing...');

    // Get birthday template
    const { data: template, error: templateError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('type', 'birthday')
        .eq('is_active', true)
        .single();

    console.log('Template lookup result:', { template, templateError });

    if (!template) {
        console.log('No active birthday template found');
        return 0;
    }

    // Get customers with birthday today (using Mexico timezone UTC-6)
    const now = new Date();
    const mexicoOffset = -6 * 60; // UTC-6 in minutes
    const mexicoTime = new Date(now.getTime() + (mexicoOffset + now.getTimezoneOffset()) * 60000);
    const month = mexicoTime.getMonth() + 1;
    const day = mexicoTime.getDate();

    console.log(`Checking birthdays for Mexico date: ${mexicoTime.toISOString().split('T')[0]} (Month: ${month}, Day: ${day})`);

    const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name, email, birth_date')
        .not('email', 'is', null)
        .not('birth_date', 'is', null);

    console.log(`Customer query result: ${customers?.length || 0} customers found, error:`, customersError);

    if (!customers || customers.length === 0) {
        console.log('No customers with birth_date and email found');
        return 0;
    }

    // Filter customers with birthday today
    const birthdayCustomers = customers.filter((customer: any) => {
        if (!customer.birth_date) return false;
        const birthDate = new Date(customer.birth_date);
        const matches = birthDate.getMonth() + 1 === month && birthDate.getDate() === day;
        if (matches) {
            console.log(`Birthday match found: ${customer.name} (${customer.email}) - Birth date: ${customer.birth_date}`);
        }
        return matches;
    });

    console.log(`Found ${birthdayCustomers.length} customers with birthday today`);

    // Send notification to each customer
    let sentCount = 0;
    for (const customer of birthdayCustomers) {
        try {
            await sendNotification(supabase, {
                templateId: template.id,
                customerId: customer.id,
                customerEmail: customer.email,
                customerName: customer.name,
                notificationType: 'birthday',
                variables: {
                    customer_name: customer.name,
                    company_name: 'Alarmas ADZ',
                },
            });
            sentCount++;
        } catch (error) {
            console.error(`Error sending birthday notification to ${customer.email}:`, error);
        }
    }

    return sentCount;
}

// Process annual fee notifications
async function processAnnualFeeNotifications(supabase: any): Promise<number> {
    // Get annual fee template
    const { data: template } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('type', 'annual_fee_due')
        .eq('is_active', true)
        .single();

    if (!template) {
        console.log('No active annual fee template found');
        return 0;
    }

    // Get customers with annual fee due in 30 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const { data: customers } = await supabase
        .from('customers')
        .select('id, name, email, account_number, annual_fee_due_date')
        .not('email', 'is', null)
        .not('annual_fee_due_date', 'is', null)
        .gte('annual_fee_due_date', futureDate.toISOString().split('T')[0])
        .lte('annual_fee_due_date', futureDate.toISOString().split('T')[0]);

    if (!customers || customers.length === 0) {
        return 0;
    }

    console.log(`Found ${customers.length} customers with annual fee due in 30 days`);

    // Send notification to each customer
    let sentCount = 0;
    for (const customer of customers) {
        try {
            await sendNotification(supabase, {
                templateId: template.id,
                customerId: customer.id,
                customerEmail: customer.email,
                customerName: customer.name,
                notificationType: 'annual_fee_due',
                variables: {
                    customer_name: customer.name,
                    account_number: customer.account_number || 'N/A',
                    due_date: new Date(customer.annual_fee_due_date).toLocaleDateString('es-MX'),
                    amount: '1,500.00', // TODO: Get from pricing or config
                    company_name: 'Alarmas ADZ',
                },
            });
            sentCount++;
        } catch (error) {
            console.error(`Error sending annual fee notification to ${customer.email}:`, error);
        }
    }

    return sentCount;
}

// Process payment reminder notifications
async function processPaymentReminderNotifications(supabase: any): Promise<number> {
    // Get payment reminder template
    const { data: template } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('type', 'payment_reminder')
        .eq('is_active', true)
        .single();

    if (!template) {
        console.log('No active payment reminder template found');
        return 0;
    }

    // Get customers with overdue payments (>2 months)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const { data: customers } = await supabase
        .from('customers')
        .select('id, name, email, account_number, last_payment_date')
        .not('email', 'is', null)
        .or(`last_payment_date.is.null,last_payment_date.lt.${twoMonthsAgo.toISOString()}`);

    if (!customers || customers.length === 0) {
        return 0;
    }

    console.log(`Found ${customers.length} customers with overdue payments`);

    // Check if notification was sent recently (avoid spam)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    let sentCount = 0;
    for (const customer of customers) {
        try {
            // Check last notification
            const { data: lastNotification } = await supabase
                .from('notification_history')
                .select('sent_at')
                .eq('customer_id', customer.id)
                .eq('notification_type', 'payment_reminder')
                .gte('sent_at', fifteenDaysAgo.toISOString())
                .order('sent_at', { ascending: false })
                .limit(1)
                .single();

            if (lastNotification) {
                console.log(`Skipping ${customer.email} - notification sent recently`);
                continue;
            }

            // Calculate months overdue
            const lastPayment = customer.last_payment_date ? new Date(customer.last_payment_date) : null;
            const monthsOverdue = lastPayment
                ? Math.floor((Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24 * 30))
                : 3;

            await sendNotification(supabase, {
                templateId: template.id,
                customerId: customer.id,
                customerEmail: customer.email,
                customerName: customer.name,
                notificationType: 'payment_reminder',
                variables: {
                    customer_name: customer.name,
                    account_number: customer.account_number || 'N/A',
                    amount: (monthsOverdue * 500).toFixed(2), // TODO: Get from pricing
                    months_overdue: monthsOverdue.toString(),
                    last_payment_date: lastPayment ? lastPayment.toLocaleDateString('es-MX') : 'N/A',
                    company_name: 'Alarmas ADZ',
                },
            });
            sentCount++;
        } catch (error) {
            console.error(`Error sending payment reminder to ${customer.email}:`, error);
        }
    }

    return sentCount;
}

// Helper function to send notification via send-notification function
async function sendNotification(supabase: any, data: any): Promise<void> {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send notification: ${response.status} - ${error}`);
    }
}
