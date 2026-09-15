import { Children, useState, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { CheckIcon, CopyIcon } from './icons'

/** Recursively extract plain text from React children */
function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children)
  }
  return ''
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(getText())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable — no-op
    }
  }

  return (
    <button
      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-canvas hover:text-ink"
      onClick={copy}
      title="Copy code"
    >
      {copied ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Fenced code block: header with language label + copy, then highlighted code */
function CodeBlock({ children }: { children?: ReactNode }) {
  let language = ''
  let codeText = ''
  try {
    const codeEl = Children.only(children) as ReactElement<{
      className?: string
      children?: ReactNode
    }>
    const className = codeEl.props.className ?? ''
    language = /language-(\w+)/.exec(className)?.[1] ?? ''
    codeText = extractText(codeEl.props.children)
    return (
      <div className="my-3 overflow-hidden rounded-xl border border-edge">
        <div className="flex items-center justify-between border-b border-edge bg-surface px-3 py-1.5">
          <span className="font-mono text-xs text-muted">{language || 'code'}</span>
          <CopyButton getText={() => codeText} />
        </div>
        <pre className="overflow-x-auto bg-code-bg p-3.5 font-mono text-[13px] leading-relaxed">
          {children}
        </pre>
      </div>
    )
  } catch {
    // Fallback for unexpected structure
    return <pre className="overflow-x-auto rounded-xl bg-code-bg p-3.5 font-mono text-[13px]">{children}</pre>
  }
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          code: ({ className, children }) => {
            // Block code (handled by pre) carries language-/hljs classes
            const isBlock = /language-|hljs/.test(className ?? '')
            if (isBlock) return <code className={className}>{children}</code>
            return <code className="md-code">{children}</code>
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
