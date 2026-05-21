-- Flyway V15 - Add dish images for report cooking history cards
-- This migration only enriches seeded report dishes with stable public image URLs.

UPDATE dish
SET image_url = CASE id
    WHEN 4301 THEN 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80'
    WHEN 4302 THEN 'https://images.unsplash.com/photo-1604908176997-4313f3f3b51f?auto=format&fit=crop&w=1200&q=80'
    WHEN 4303 THEN 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80'
    WHEN 4304 THEN 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1200&q=80'
    WHEN 4305 THEN 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80'
    ELSE image_url
END
WHERE id IN (4301, 4302, 4303, 4304, 4305);