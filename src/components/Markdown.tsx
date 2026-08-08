import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none text-foreground [&_p]:my-2 [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-ink [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:text-parchment [&_strong]:font-semibold [&_strong]:text-primary [&_a]:text-primary [&_a]:underline [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}