UPDATE public.seo_location_pages
SET content = replace(replace(replace(replace(replace(replace(replace(
  content,
  '](#oak-cliff)', '](#oak-cliff-and-south-dallas)'),
  '](#downtown)', '](#downtown-and-urban-core)'),
  '](#east-dallas)', '](#east-dallas-and-lakewood)'),
  '](#north-dallas)', '](#north-dallas-and-park-cities)'),
  '](#outer-ring)', '](#outer-ring-cities)'),
  '](#zip-codes)', '](#hvac-service-by-zip-code)'),
  '](#housing-types)', '](#hvac-by-housing-type)')
WHERE url_slug = '/service-areas/';