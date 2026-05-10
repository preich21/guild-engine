"use client";

import { StreamLanguage } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

type JsonCodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  ariaLabel: string;
};

type JsonParserState = {
  inString: boolean;
  escape: boolean;
};

const jsonLanguage = StreamLanguage.define<JsonParserState>({
  name: "json",
  startState: () => ({ inString: false, escape: false }),
  token(stream, state) {
    if (state.inString) {
      let escaped = state.escape;

      while (!stream.eol()) {
        const next = stream.next();

        if (escaped) {
          escaped = false;
          continue;
        }

        if (next === "\\") {
          escaped = true;
          continue;
        }

        if (next === "\"") {
          state.inString = false;
          state.escape = false;
          return stream.peek() === ":" ? "propertyName" : "string";
        }
      }

      state.escape = escaped;
      return "string";
    }

    if (stream.eatSpace()) {
      return null;
    }

    const next = stream.peek();

    if (next === "\"") {
      stream.next();
      state.inString = true;
      state.escape = false;
      return "string";
    }

    if (next && /[-0-9]/.test(next)) {
      stream.match(/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      return "number";
    }

    if (stream.match("true") || stream.match("false")) {
      return "bool";
    }

    if (stream.match("null")) {
      return "null";
    }

    stream.next();
    return "punctuation";
  },
});

export function JsonCodeEditor({
  value,
  onChange,
  readOnly = false,
  ariaLabel,
}: JsonCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const extensions = [
      basicSetup,
      jsonLanguage,
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
      EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !readOnly) {
          onChangeRef.current?.(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": {
          height: "100%",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
          fontSize: "0.875rem",
        },
        ".cm-scroller": {
          maxHeight: "30rem",
          minHeight: "30rem",
          overflow: "auto",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
        },
        ".cm-gutters": {
          backgroundColor: "var(--muted)",
          color: "var(--muted-foreground)",
          borderRightColor: "var(--border)",
        },
        ".cm-content": {
          caretColor: "var(--foreground)",
        },
        ".cm-activeLine, .cm-activeLineGutter": {
          backgroundColor: "color-mix(in oklch, var(--muted) 55%, transparent)",
        },
        "&.cm-focused": {
          outline: "2px solid var(--ring)",
          outlineOffset: "2px",
        },
      }),
    ];

    const view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions,
      }),
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ariaLabel, readOnly]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view || view.state.doc.toString() === value) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    });
  }, [value]);

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background">
      <div ref={containerRef} />
    </div>
  );
}
