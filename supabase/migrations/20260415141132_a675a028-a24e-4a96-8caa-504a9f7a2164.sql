-- Update Bluffview/Kessler page meta to target "energy-efficient home solutions bluffview" query (position 3.2)
UPDATE page_seo 
SET 
  meta_title = 'Energy-Efficient Home Solutions Bluffview & Kessler Park | Truficient',
  meta_description = 'Energy-efficient HVAC solutions for Bluffview and Kessler Park homes. Ductless mini-splits preserve historic architecture while cutting energy costs. Call 214-238-4349.',
  og_title = 'Energy-Efficient Home Solutions Bluffview & Kessler Park Dallas',
  og_description = 'Energy-efficient HVAC solutions for Bluffview and Kessler Park homes. Ductless mini-splits preserve historic architecture while cutting energy costs.'
WHERE id = '540d31c6-49ce-4c36-b6bc-fe626ee20749';

-- Also update the Bluffview ductless page to include energy-efficient language
UPDATE page_seo
SET
  meta_description = 'Energy-efficient ductless HVAC for Bluffview ravine homes and Greenway Parks cottages. Mitsubishi mini-split installation by Truficient. Call 214-238-4349.'
WHERE id = '7be1461c-2d9a-4cc8-b689-d970621b111c';