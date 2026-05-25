import BlogPostClient from './BlogPostClient'

export function generateStaticParams() {
  return [{ slug: 'why-every-ai-agent-needs-a-passport' }]
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  return <BlogPostClient slug={params.slug} />
}
