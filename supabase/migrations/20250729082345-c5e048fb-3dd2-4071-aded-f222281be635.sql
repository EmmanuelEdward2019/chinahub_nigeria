-- Remove unwanted categories and duplicate Others
DELETE FROM categories WHERE name IN ('Sports & Recreation', 'Food & Beverage', 'Automotive');

-- Remove duplicate Others entries (keep only one)
DELETE FROM categories 
WHERE name = 'Others' 
AND id NOT IN (
  SELECT MIN(id) 
  FROM categories 
  WHERE name = 'Others'
);

-- Update the remaining Others category to ensure it's ordered last
UPDATE categories 
SET name = 'Others', icon = 'package' 
WHERE name = 'Others';

-- Add a display_order column to control category ordering
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Set display order for all categories (Others will be last)
UPDATE categories SET display_order = 
  CASE name
    WHEN 'Agriculture' THEN 1
    WHEN 'Beauty & Health' THEN 2
    WHEN 'Computers' THEN 3
    WHEN 'Construction Materials' THEN 4
    WHEN 'Electricals' THEN 5
    WHEN 'Electronics' THEN 6
    WHEN 'Fashion & Apparel' THEN 7
    WHEN 'Furniture' THEN 8
    WHEN 'Home & Garden' THEN 9
    WHEN 'Industrial Equipment' THEN 10
    WHEN 'Jewelry & Accessories' THEN 11
    WHEN 'Kitchen Equipment' THEN 12
    WHEN 'Medical Equipment' THEN 13
    WHEN 'Musical Instruments' THEN 14
    WHEN 'Packaging & Printing' THEN 15
    WHEN 'Phones' THEN 16
    WHEN 'Steel Materials' THEN 17
    WHEN 'Textiles' THEN 18
    WHEN 'Toys & Games' THEN 19
    WHEN 'Others' THEN 20
    ELSE 999
  END;