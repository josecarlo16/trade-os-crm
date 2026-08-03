import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
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

    // Lovable Hosting has SPA fallback but does NOT do directory-index
    // resolution or honour `_redirects`. Extensionless URLs always serve the
    // empty SPA shell, while the prerendered HTML lives at `dist/<path>.html`.
    // Sitemap entries must point at the `.html` form so crawlers fetch the
    // prerendered content with proper <head> tags. The root path is special-
    // cased to stay bare. Anything already containing a file extension is
    // left alone.
    const toHtmlUrl = (path: string): string => {
      if (!path || path === '/') return `${baseUrl}/`;
      const trimmed = path.replace(/\/+$/, '');
      if (/\.[a-z0-9]{2,5}$/i.test(trimmed)) return `${baseUrl}${trimmed}`;
      return `${baseUrl}${trimmed}.html`;
    };

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

    if (locationRes.error) console.error('Location pages error:', locationRes.error);
    if (blogRes.error) console.error('Blog posts error:', blogRes.error);
    if (equipmentRes.error) console.error('Equipment pages error:', equipmentRes.error);

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
      { loc: '/dallas-urban-heat-island-effect-energy-hvac', changefreq: 'monthly', priority: '0.9' },
      { loc: '/ac-feedback-loop-dallas', changefreq: 'monthly', priority: '0.7' },
      { loc: '/dallas-hvac-ercot-grid-demand', changefreq: 'monthly', priority: '0.7' },
      { loc: '/dallas-electricity-bill-summer-hvac', changefreq: 'monthly', priority: '0.7' },
      { loc: '/trees-hvac-dallas-cooling', changefreq: 'monthly', priority: '0.7' },
      { loc: '/oak-cliff-heat-island-paradox-dallas', changefreq: 'monthly', priority: '0.7' },
      { loc: '/mitsubishi-mini-split-dallas-heat-island', changefreq: 'monthly', priority: '0.8' },
      { loc: '/daikin-vrf-dallas-commercial-heat-island', changefreq: 'monthly', priority: '0.8' },
      { loc: '/gree-mini-split-dallas-heat-island', changefreq: 'monthly', priority: '0.7' },
      { loc: '/heat-island-hvac-bishop-arts-dallas', changefreq: 'monthly', priority: '0.7' },
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
    <loc>${toHtmlUrl(page.loc)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Location / SEO pages
    if (locationPages.length > 0) {
      xml += `

  <!-- Location Pages (${locationPages.length} total) -->`;
      for (const page of locationPages) {
        const slug = page.url_slug.replace(/^\/|\/$/g, '');
        const lastmod = page.updated_at
          ? new Date(page.updated_at).toISOString().split('T')[0]
          : today;
        const priority = page.page_type?.includes('Hub') ? '0.8' : '0.7';
        xml += `
  <url>
    <loc>${toHtmlUrl('/' + slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
      }
    }

    // Blog posts
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
    <loc>${toHtmlUrl('/blog/' + post.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    }

    // Equipment pages
    if (equipmentPages.length > 0) {
      xml += `

  <!-- Equipment Pages (${equipmentPages.length} total) -->`;
      for (const page of equipmentPages) {
        const lastmod = page.updated_at
          ? new Date(page.updated_at).toISOString().split('T')[0]
          : today;
        xml += `
  <url>
    <loc>${toHtmlUrl('/equipment/' + page.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
      }
    }

    xml += `
</urlset>`;

    console.log(`Sitemap generated: ${staticPages.length} static + ${locationPages.length} location + ${blogPosts.length} blog + ${equipmentPages.length} equipment = ${staticPages.length + locationPages.length + blogPosts.length + equipmentPages.length} total URLs`);

    return new Response(xml, {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Sitemap generation error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://truficient.com/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }
});