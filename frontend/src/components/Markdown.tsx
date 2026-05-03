import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  children: string;
  className?: string;
}

export default function Markdown({ children, className = "" }: Props) {
  return (
    <div className={`markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 className="mt-3 mb-2 text-base font-semibold text-zinc-50" {...props} />
          ),
          h2: (props) => (
            <h2 className="mt-3 mb-2 text-sm font-semibold uppercase tracking-wider text-cyan-300" {...props} />
          ),
          h3: (props) => (
            <h3 className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-300" {...props} />
          ),
          p: (props) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
          ul: (props) => <ul className="mb-2 list-disc pl-5 space-y-0.5" {...props} />,
          ol: (props) => <ol className="mb-2 list-decimal pl-5 space-y-0.5" {...props} />,
          li: (props) => <li className="leading-relaxed" {...props} />,
          strong: (props) => <strong className="font-semibold text-zinc-50" {...props} />,
          em: (props) => <em className="italic text-zinc-200" {...props} />,
          code: ({ className: c, children, ...rest }) => {
            const isBlock = (c ?? "").startsWith("language-");
            if (isBlock) {
              return (
                <code className="block whitespace-pre-wrap rounded bg-zinc-950/80 px-2 py-1.5 font-mono text-[12px] text-zinc-100" {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-zinc-800/80 px-1 py-0.5 font-mono text-[12px] text-cyan-200" {...rest}>
                {children}
              </code>
            );
          },
          pre: (props) => <pre className="mb-2 overflow-x-auto" {...props} />,
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 underline hover:text-cyan-200"
            />
          ),
          blockquote: (props) => (
            <blockquote className="mb-2 border-l-2 border-zinc-700 pl-3 italic text-zinc-300" {...props} />
          ),
          table: (props) => (
            <div className="mb-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-left font-semibold" {...props} />
          ),
          td: (props) => <td className="border border-zinc-700 px-2 py-1" {...props} />,
          hr: () => <hr className="my-3 border-zinc-700/60" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
