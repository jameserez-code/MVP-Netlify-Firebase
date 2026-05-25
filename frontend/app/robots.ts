export const dynamic = "force-static"
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/'] },
    sitemap: 'https://passport-agent-demo.netlify.app/sitemap.xml',
  }
}
