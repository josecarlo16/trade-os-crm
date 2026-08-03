UPDATE blog_posts 
SET content = regexp_replace(
  content,
  E'<h2 class="text-3xl font-bold mb-3 mt-8">Executive Summary</h2>',
  E'<figure class="my-8">\n  <img src="/images/blog/dallas-heat-island-map.png" alt="Visualizing Dallas Urban Heat Islands: Summer Temperature Differentials map showing heat intensity across Downtown, West Dallas, Love Field, Medical District and other neighborhoods" class="w-full rounded-lg shadow-md" loading="lazy" />\n  <figcaption class="text-center text-sm text-gray-500 mt-2 italic">Dallas urban heat island map showing summer temperature differentials across neighborhoods. Source: City of Dallas / Texas Trees Foundation</figcaption>\n</figure>\n\n<h2 class="text-3xl font-bold mb-3 mt-8">Executive Summary</h2>',
  ''
)
WHERE slug = 'dallas-urban-heat-island-effect-energy-hvac';