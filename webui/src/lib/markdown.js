const blockTags = {
  1: "h1",
  2: "h2",
  3: "h3",
};

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderMarkdown(markdown) {
  const lines = String(markdown ?? "").replaceAll("\r\n", "\n").split("\n");
  const html = [];
  let inList = false;
  let inOrderedList = false;
  let inCode = false;
  let codeLanguage = "";
  let codeLines = [];

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
  };

  const flushCode = () => {
    const code = escapeHtml(codeLines.join("\n"));
    if (codeLanguage === "mermaid") {
      html.push(`<div class="mermaid-block" data-mermaid-diagram><pre class="mermaid-source"><code>${code}</code></pre></div>`);
    } else {
      const languageClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : "";
      html.push(`<pre><code${languageClass}>${code}</code></pre>`);
    }
    codeLines = [];
    codeLanguage = "";
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        closeList();
        inCode = true;
        codeLanguage = getCodeFenceLanguage(line);
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      closeList();
      continue;
    }

    if (line.startsWith("|") && lines[index + 1]?.trim().startsWith("|")) {
      closeList();
      const tableLines = [];
      while (lines[index]?.trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      index -= 1;
      html.push(renderTable(tableLines));
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const tag = blockTags[level] ?? "h3";
      html.push(`<${tag}>${renderInline(heading[2])}</${tag}>`);
      continue;
    }

    if (line.startsWith(">")) {
      closeList();
      html.push(`<blockquote>${renderInline(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      if (!inOrderedList) {
        closeList();
        html.push("<ol>");
        inOrderedList = true;
      }
      html.push(`<li>${renderInline(ordered[1])}</li>`);
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      if (!inList) {
        closeList();
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${renderInline(unordered[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInline(line)}</p>`);
  }

  if (inCode) flushCode();
  closeList();
  return html.join("");
}

function getCodeFenceLanguage(line) {
  const info = line.replace(/^`{3,}/, "").trim();
  const match = /^(?:\{?\.?)([a-z0-9_-]+)/i.exec(info);
  return match ? match[1].toLowerCase() : "";
}

function renderInline(value) {
  let html = escapeHtml(value);
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, src) => {
    if (!isSafeImageSrc(src)) return match;
    return `<img src="${src}" alt="${alt}" loading="lazy" />`;
  });
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  return html;
}

function isSafeImageSrc(src) {
  return /^(https?:\/\/|\/api\/kb-assets\/)/.test(src);
}

function renderTable(lines) {
  if (lines.length < 2) return `<p>${renderInline(lines.join(" "))}</p>`;
  const rows = lines
    .filter((line, index) => index !== 1)
    .map(splitTableRow);
  const [head, ...body] = rows;
  const header = head.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
  const bodyRows = body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="md-table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
}

function splitTableRow(line) {
  const cells = [];
  let cell = "";
  let codeFenceLength = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\\" && line[index + 1] === "|") {
      cell += "|";
      index += 1;
      continue;
    }

    if (char === "`") {
      let fenceLength = 1;
      while (line[index + fenceLength] === "`") fenceLength += 1;

      cell += line.slice(index, index + fenceLength);
      if (!codeFenceLength) {
        codeFenceLength = fenceLength;
      } else if (codeFenceLength === fenceLength) {
        codeFenceLength = 0;
      }
      index += fenceLength - 1;
      continue;
    }

    if (char === "|" && !codeFenceLength) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  if (cells[0] === "") cells.shift();
  if (cells[cells.length - 1] === "") cells.pop();
  return cells;
}
