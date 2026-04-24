import rss from "@astrojs/rss";
import MarkdownIt from "markdown-it";
import { getPublishedPosts, getPostUrl } from "@/lib/posts";
import { siteDescription, siteTitle } from "@/lib/site";

const markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });

export async function GET(context: { site: URL }) {
  const posts = await getPublishedPosts();

  return rss({
    title: siteTitle,
    description: siteDescription,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: getPostUrl(post.slug),
      content: markdown.render(post.body),
    })),
  });
}
