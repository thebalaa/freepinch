import Link from 'next/link'
import { getAllPosts } from '@/lib/markdown'
import { Calendar, User, Tag } from 'lucide-react'

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen py-16">
      {/* Hero Section */}
      <section className="relative py-20 mb-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-accent-purple/30 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-blue/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-2 mb-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-sm text-gray-300">
              Latest insights and tutorials
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-accent-purple to-accent-blue">
              RoboClaw Blog
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Learn how to deploy, secure, and optimize your OpenClaw instances with expert guides and community insights
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {posts.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-gray-400 text-lg">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <article key={post.slug} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:border-accent-purple/50 transition-all group">
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-3xl font-bold mb-4 text-white group-hover:text-accent-purple transition-colors">
                      {post.title}
                    </h2>
                  </Link>

                  <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <time dateTime={post.date}>
                        {new Date(post.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                    </div>
                    {post.author && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{post.author}</span>
                      </div>
                    )}
                  </div>

                  {post.excerpt && (
                    <p className="text-gray-300 leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                  )}

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-accent-blue hover:text-accent-purple transition-colors font-medium"
                  >
                    Read more →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
