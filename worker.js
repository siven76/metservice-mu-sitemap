export default {
    async fetch(request) {
        const url = new URL(request.url);

        // If the request is for /sitemap.xml, generate the sitemap
        if (url.pathname === "/sitemap.xml") {
            return await generateSitemap();
        }

        // Otherwise, proxy requests to the original site
        return await proxyRequest(request);
    }
};

// Function to proxy requests
async function proxyRequest(request) {
    const originalDomain = "metservice.intnet.mu"; // Original domain
    const newUrl = new URL(request.url);
    newUrl.hostname = originalDomain;

    const response = await fetch(newUrl.toString(), {
        headers: {
            "User-Agent": request.headers.get("User-Agent"),
            "Referer": newUrl.toString()
        }
    });

    return response;
}

// Function to generate the sitemap
async function generateSitemap() {
    const baseUrl = "https://metservice.mu";
    const pagesToCrawl = ["/"]; // Start with the homepage
    const crawledPages = new Set();
    let sitemapEntries = [];

    while (pagesToCrawl.length > 0) {
        const path = pagesToCrawl.pop();
        if (crawledPages.has(path)) continue;

        crawledPages.add(path);
        const pageUrl = `${baseUrl}${path}`;

        try {
            const response = await fetch(pageUrl);
            const contentType = response.headers.get("Content-Type") || "";

            if (contentType.includes("text/html")) {
                const html = await response.text();
                const links = [...html.matchAll(/href="([^"#]+)"/g)].map(m => m[1]);

                for (let link of links) {
                    if (!link.startsWith("http")) {
                        link = new URL(link, baseUrl).pathname; // Convert relative to absolute paths
                    }

                    if (!crawledPages.has(link) && !link.includes("mailto:") && !link.includes("tel:")) {
                        pagesToCrawl.push(link);
                    }
                }
            }

            sitemapEntries.push(`<url><loc>${pageUrl}</loc><lastmod>${new Date().toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);
        } catch (error) {
            console.error(`Failed to fetch: ${pageUrl}`, error);
        }
    }

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join("\n")}
</urlset>`;

    return new Response(sitemapContent, {
        headers: { "Content-Type": "application/xml" }
    });
}
