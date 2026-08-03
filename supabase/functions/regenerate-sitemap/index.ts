import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = 'https://truficient.com';
    const today = new Date().toISOString().split('T')[0];

    // Fetch all dynamic content in parallel
    const [locationRes, blogRes, equipmentRes] = await Promise.all([
      supabase
        .from('seo_location_pages')
        .select('url_slug, updated_at, page_type')
        .eq('published', true)
        .order('updated_at', { ascending: false }),
      supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
      supabase
        .from('equipment_pages')
        .select('slug, updated_at')
        .eq('published', true)
        .order('updated_at', { ascending: false }),
    ]);

    const locationPages = locationRes.data || [];
    const blogPosts = blogRes.data || [];
    const equipmentPages = equipmentRes.data || [];

    // Static pages
    const staticPages = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/about', changefreq: 'monthly', priority: '0.8' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.9' },
      { loc: '/gallery', changefreq: 'weekly', priority: '0.7' },
      { loc: '/services/residential', changefreq: 'monthly', priority: '0.9' },
      { loc: '/services/commercial', changefreq: 'monthly', priority: '0.9' },
      { loc: '/services/ductless', changefreq: 'monthly', priority: '0.9' },
      { loc: '/hvac-estimate', changefreq: 'monthly', priority: '0.9' },
      { loc: '/central-ac-estimate', changefreq: 'monthly', priority: '0.9' },
      { loc: '/mini-split-estimate', changefreq: 'monthly', priority: '0.9' },
      { loc: '/multi-zone-estimate', changefreq: 'monthly', priority: '0.9' },
      { loc: '/estimators/sizing', changefreq: 'monthly', priority: '0.8' },
      { loc: '/estimators/cost', changefreq: 'monthly', priority: '0.8' },
      { loc: '/estimators/savings', changefreq: 'monthly', priority: '0.8' },
      { loc: '/scanner', changefreq: 'weekly', priority: '0.8' },
      { loc: '/equipment', changefreq: 'weekly', priority: '0.7' },
      { loc: '/service-areas', changefreq: 'weekly', priority: '0.8' },
      { loc: '/service-areas/dallas-area', changefreq: 'monthly', priority: '0.7' },
      { loc: '/service-areas/north-dallas-area', changefreq: 'monthly', priority: '0.7' },
      { loc: '/service-areas/frisco-mckinney-area', changefreq: 'monthly', priority: '0.7' },
      { loc: '/service-areas/mid-cities-area', changefreq: 'monthly', priority: '0.7' },
      { loc: '/service-areas/south-dallas-area', changefreq: 'monthly', priority: '0.7' },
      { loc: '/blog', changefreq: 'weekly', priority: '0.8' },
      { loc: '/careers', changefreq: 'weekly', priority: '0.6' },
      { loc: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
      { loc: '/terms-of-service', changefreq: 'yearly', priority: '0.3' },
    ];

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->`;

    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    if (locationPages.length > 0) {
      xml += `

  <!-- Location Pages (${locationPages.length} total) -->`;
      for (const page of locationPages) {
        const slug = page.url_slug.replace(/^\/|\/$/g, '');
        const lastmod = page.updated_at ? new Date(page.updated_at).toISOString().split('T')[0] : today;
        const priority = page.page_type?.includes('Hub') ? '0.8' : '0.7';
        xml += `
  <url>
    <loc>${baseUrl}/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
      }
    }

    if (blogPosts.length > 0) {
      xml += `

  <!-- Blog Posts (${blogPosts.length} total) -->`;
      for (const post of blogPosts) {
        const lastmod = post.updated_at
          ? new Date(post.updated_at).toISOString().split('T')[0]
          : post.published_at
          ? new Date(post.published_at).toISOString().split('T')[0]
          : today;
        xml += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    }

    if (equipmentPages.length > 0) {
      xml += `

  <!-- Equipment Pages (${equipmentPages.length} total) -->`;
      for (const page of equipmentPages) {
        const lastmod = page.updated_at ? new Date(page.updated_at).toISOString().split('T')[0] : today;
        xml += `
  <url>
    <loc>${baseUrl}/equipment/${page.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    }

    xml += `
</urlset>`;

    const urlCount = staticPages.length + locationPages.length + blogPosts.length + equipmentPages.length;

    // Store snapshot
    const { error: insertError } = await supabase
      .from('sitemap_snapshots')
      .insert({ xml_content: xml, url_count: urlCount });

    if (insertError) {
      console.error('Failed to store snapshot:', insertError);
    }

    // Keep only the last 30 snapshots
    const { data: oldSnapshots } = await supabase
      .from('sitemap_snapshots')
      .select('id')
      .order('created_at', { ascending: false })
      .range(30, 1000);

    if (oldSnapshots && oldSnapshots.length > 0) {
      await supabase
        .from('sitemap_snapshots')
        .delete()
        .in('id', oldSnapshots.map(s => s.id));
    }

    console.log(`Sitemap regenerated: ${urlCount} total URLs`);

    return new Response(JSON.stringify({
      success: true,
      url_count: urlCount,
      breakdown: {
        static: staticPages.length,
        location: locationPages.length,
        blog: blogPosts.length,
        equipment: equipmentPages.length,
      },
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sitemap regeneration error:', error);
    return new Response(JSON.stringify({ success: false, error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
