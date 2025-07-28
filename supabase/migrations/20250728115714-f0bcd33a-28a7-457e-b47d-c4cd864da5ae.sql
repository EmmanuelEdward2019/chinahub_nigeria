-- Add more categories
INSERT INTO public.categories (name, icon) VALUES
('Home & Garden', '🏡'),
('Fashion & Apparel', '👕'),
('Sports & Recreation', '⚽'),
('Toys & Games', '🧸'),
('Beauty & Health', '💄'),
('Automotive', '🚗'),
('Industrial Equipment', '🏭'),
('Agriculture', '🌾'),
('Food & Beverage', '🍎'),
('Packaging & Printing', '📦'),
('Textiles', '🧵'),
('Construction Materials', '🧱'),
('Medical Equipment', '🏥'),
('Jewelry & Accessories', '💍'),
('Musical Instruments', '🎵'),
('Others', '📋')
ON CONFLICT (name) DO NOTHING;