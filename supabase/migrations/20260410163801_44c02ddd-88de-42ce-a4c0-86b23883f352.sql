UPDATE blog_posts 
SET content = regexp_replace(
  -- First, remove the old presentation section (the duplicate hr, heading, paragraph, and iframe div)
  regexp_replace(
    content,
    E'<hr class="my-8 border-t border-gray-200" />\\s*<hr class="my-8 border-t border-gray-200" />\\s*<h2 class="text-3xl font-bold mb-3 mt-8">Interactive Presentation</h2>\\s*<p class="mb-4 leading-relaxed">Explore the key findings[^<]*</p>\\s*<div class="my-8"[^>]*>\\s*<iframe[^>]*></iframe>\\s*</div>',
    '',
    'g'
  ),
  -- Then insert presentation right after the first <hr>
  E'<hr class="my-8 border-t border-gray-200" />',
  E'<hr class="my-8 border-t border-gray-200" />\n\n<div class="my-8" style="position: relative; width: 100%; padding-bottom: 56.25%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">\n  <iframe src="/presentations/dallas-heat-island.html" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allowfullscreen loading="lazy" title="Dallas Heat Island Effect - Interactive Presentation"></iframe>\n</div>\n\n<p class="mb-4 leading-relaxed text-sm italic">Navigate the interactive presentation above to explore key findings, then read the full research report below.</p>\n\n<hr class="my-8 border-t border-gray-200" />',
  '' -- only replace first occurrence
)
WHERE slug = 'dallas-urban-heat-island-effect-energy-hvac';