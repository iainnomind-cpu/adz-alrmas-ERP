import { Database } from './src/lib/database.types';

type Customers = Database['public']['Tables']['customers'];
type CustomerRow = Customers['Row'];
type CustomerInsert = Customers['Insert'];
type CustomerUpdate = Customers['Update'];

const test: CustomerRow = {
    id: '1',
    name: 'test',
    owner_name: null,
    email: null,
    phone: null,
    address: null,
    customer_type: 'test',
    communication_tech: 'test',
    monitoring_plan: null,
    status: 'test',
    business_name: null,
    gps_latitude: null,
    gps_longitude: null,
    property_type: 'test',
    credit_classification: 'test',
    account_type: 'test',
    billing_preference: 'test',
    billing_cycle: 'test',
    consolidation_parent_id: null,
    account_number: null,
    is_master_account: false,
    service_count: 0,
    first_service_date: null,
    is_suspended: false,
    suspension_start_date: null,
    suspension_end_date: null,
    suspension_reason: null,
    created_at: 'now',
    updated_at: 'now',
};

console.log(test);
