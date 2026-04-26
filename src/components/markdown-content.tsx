import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: ({ children }) => <h1 className="text-3xl font-semibold tracking-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="text-2xl font-semibold tracking-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xl font-semibold tracking-tight">{children}</h3>,
  p: ({ children }) => <p className="leading-7 text-foreground">{children}</p>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="font-medium text-primary underline underline-offset-4"
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="ml-6 list-disc space-y-2">{children}</ul>,
  ol: ({ children }) => <ol className="ml-6 list-decimal space-y-2">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-border pl-4 text-muted-foreground">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm text-muted-foreground">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm">{children}</pre>
  ),
  hr: () => <hr className="border-border" />,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-muted px-3 py-2 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
};

type MarkdownContentProps = {
  content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="space-y-5">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
