/*
  # Add shipping_days field to products table
  
  1. Changes
    - Add shipping_days field to products table to store shipping time for each product
    
  2. Purpose
    - Allow admin to configure shipping days for each product
    - Display shipping time information on product listings
*/

-- Add shipping_days field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_days integer DEFAULT 3;

-- Update existing products to have a default shipping time
UPDATE products SET shipping_days = 3 WHERE shipping_days IS NULL;

-- Add comment to the column
COMMENT ON COLUMN products.shipping_days IS 'Number of days it takes to ship this product';

