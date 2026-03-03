-- Advanced Features Migration for Poultry Management System
-- This migration adds feed inventory, health tracking, and environmental monitoring

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Feed & Inventory Tracking
CREATE TABLE IF NOT EXISTS feed_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_type TEXT NOT NULL, -- e.g., Starter, Grower, Layer, Finisher
    quantity_kg NUMERIC NOT NULL DEFAULT 0,
    cost_per_kg NUMERIC DEFAULT 0,
    last_restocked DATE DEFAULT CURRENT_DATE,
    minimum_threshold_kg NUMERIC DEFAULT 50, -- Alert threshold
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feed Consumption Log
CREATE TABLE IF NOT EXISTS feed_consumption (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flock_id UUID REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    feed_type TEXT NOT NULL,
    amount_consumed_kg NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Health & Vaccination Tracker
CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flock_id UUID REFERENCES flocks(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    record_type TEXT NOT NULL, -- e.g., Vaccination, Medication, Vet Visit, Mortality, Inspection
    description TEXT,
    cost NUMERIC DEFAULT 0,
    veterinarian_name TEXT,
    next_due_date DATE, -- For vaccinations that need follow-up
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Environmental Logging
CREATE TABLE IF NOT EXISTS environmental_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_of_day TIME, -- Optional: track multiple readings per day
    avg_temperature NUMERIC, -- in Celsius
    humidity_percentage NUMERIC,
    lighting_hours NUMERIC,
    ventilation_status TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add initial_quantity to flocks if not exists (for mortality calculations)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'flocks' AND column_name = 'initial_quantity'
    ) THEN
        ALTER TABLE flocks ADD COLUMN initial_quantity INTEGER DEFAULT 0;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feed_inventory_type ON feed_inventory(feed_type);
CREATE INDEX IF NOT EXISTS idx_feed_consumption_flock ON feed_consumption(flock_id);
CREATE INDEX IF NOT EXISTS idx_feed_consumption_date ON feed_consumption(date);
CREATE INDEX IF NOT EXISTS idx_health_records_flock ON health_records(flock_id);
CREATE INDEX IF NOT EXISTS idx_health_records_date ON health_records(date);
CREATE INDEX IF NOT EXISTS idx_health_records_type ON health_records(record_type);
CREATE INDEX IF NOT EXISTS idx_environmental_logs_date ON environmental_logs(date);

-- Trigger to update updated_at on feed_inventory
CREATE TRIGGER IF NOT EXISTS update_feed_inventory_updated_at 
    BEFORE UPDATE ON feed_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default feed types if table is empty
INSERT INTO feed_inventory (feed_type, quantity_kg, cost_per_kg, minimum_threshold_kg)
SELECT 'Starter', 0, 2.50, 50
WHERE NOT EXISTS (SELECT 1 FROM feed_inventory);

INSERT INTO feed_inventory (feed_type, quantity_kg, cost_per_kg, minimum_threshold_kg)
SELECT 'Grower', 0, 2.30, 50
WHERE NOT EXISTS (SELECT 1 FROM feed_inventory WHERE feed_type = 'Grower');

INSERT INTO feed_inventory (feed_type, quantity_kg, cost_per_kg, minimum_threshold_kg)
SELECT 'Layer', 0, 2.40, 50
WHERE NOT EXISTS (SELECT 1 FROM feed_inventory WHERE feed_type = 'Layer');

INSERT INTO feed_inventory (feed_type, quantity_kg, cost_per_kg, minimum_threshold_kg)
SELECT 'Finisher', 0, 2.60, 50
WHERE NOT EXISTS (SELECT 1 FROM feed_inventory WHERE feed_type = 'Finisher');

-- Comments
COMMENT ON TABLE feed_inventory IS 'Tracks current feed stock levels and costs';
COMMENT ON TABLE feed_consumption IS 'Daily feed consumption logs per flock';
COMMENT ON TABLE health_records IS 'Health events, vaccinations, and mortality tracking';
COMMENT ON TABLE environmental_logs IS 'Environmental conditions monitoring';
COMMENT ON COLUMN feed_inventory.minimum_threshold_kg IS 'Minimum stock level before triggering low-stock alert';
COMMENT ON COLUMN health_records.next_due_date IS 'Next scheduled date for recurring vaccinations';
