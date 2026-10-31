import Markdown from "react-markdown";

// Markdown styles shared by the app, share page and print view.
export const NotesMarkdown = ({ children }: { children: string }) => (
  <Markdown
    components={{
      h1: (props) => <h1 className="mt-4 mb-3 text-xl font-semibold first:mt-0" {...props} />,
      h2: (props) => <h2 className="mt-4 mb-2 text-lg font-semibold first:mt-0" {...props} />,
      h3: (props) => <h3 className="mt-4 mb-2 text-base font-semibold first:mt-0" {...props} />,
      h4: (props) => <h4 className="mt-3 mb-1 text-sm font-semibold" {...props} />,
      p: (props) => <p className="mb-2 leading-relaxed" {...props} />,
      ul: (props) => <ul className="mb-3 list-disc space-y-1 pl-5" {...props} />,
      ol: (props) => <ol className="mb-3 list-decimal space-y-1 pl-5" {...props} />,
      li: (props) => <li className="leading-relaxed" {...props} />,
      strong: (props) => <strong className="font-semibold" {...props} />,
      code: (props) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm" {...props} />,
      blockquote: (props) => (
        <blockquote className="mb-2 border-l-4 border-border pl-4 italic text-muted-foreground" {...props} />
      ),
    }}
  >
    {children}
  </Markdown>
);
