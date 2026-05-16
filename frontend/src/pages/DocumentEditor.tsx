import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { loadAuthorDnaDataset } from "@/lib/author-dna-data";
import type { AuthorDnaDataset } from "@/lib/author-dna-data";
import AppHeader from "@/components/AppHeader";
import { cn } from "@/lib/utils";
import { Check, X, Sparkles, Activity, Send, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

type ViewMode = "document" | "sentence";

type SuggestionItem = {
  id: string;
  paragraphIndex?: number;
  category: string;
  proposed: string;
  proposedPreview?: string;
  excerpt?: string;
  targetText?: string;
  observation?: string;
};

const CATEGORY_COLORS: Record<string, { fill: string; soft: string; lightFill: string; lightSoft: string }> = {
  "Sentence Flow": { fill: "var(--category-sf-fill)", soft: "var(--category-sf-soft)" , lightFill: "var(--category-sf-fill-light)",lightSoft: "var(--category-sf-soft-light)"},
  Tone: { fill: "var(--category-tone-fill)", soft: "var(--category-tone-soft)" , lightFill: "var(--category-tone-fill-light)",lightSoft: "var(--category-tone-soft-light)"},
  "Word Choice": { fill: "var(--category-wc-fill)", soft: "var(--category-wc-soft)" , lightFill: "var(--category-wc-fill-light)",lightSoft: "var(--category-wc-soft-light)"},
  Structure: { fill: "var(--category-st-fill)", soft: "var(--category-st-soft)" , lightFill: "var(--category-st-fill-light)",lightSoft: "var(--category-st-soft-light)"},
  Punctuation: { fill: "var(--category-pu-fill)", soft: "var(--category-pu-soft)" , lightFill: "var(--category-pu-fill-light)",lightSoft: "var(--category-pu-soft-light)"},
  default: { fill: "var(--category-default-fill)", soft: "var(--category-default-soft)" , lightFill: "var(--category-default-fill-light)",lightSoft: "var(--category-default-soft-light)"},
};

function getCategoryColor(name: string) {
  return CATEGORY_COLORS[name] ?? CATEGORY_COLORS.default;
}

function MetricBar({
  score,
  fillColor = "var(--color-brand)",
  trackColor = "var(--color-brand-muted)",
}: {
  score: number;
  fillColor?: string;
  trackColor?: string;
}) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: fillColor }}
      />
    </div>
  );
}

function splitIntoSentences(paragraph: string) {
  return (paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/^\.{3}/, "")
    .replace(/\.{3}$/, "")
    .replace(/^"+|"+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSuggestionExcerpt(suggestion: SuggestionItem) {
  const excerpt = suggestion.excerpt?.trim();
  const targetText = suggestion.targetText?.trim();

  if (excerpt && targetText) {
    const normalizedExcerpt = normalizeForMatch(excerpt);
    const normalizedTarget = normalizeForMatch(targetText);
    if (normalizedTarget.includes(normalizedExcerpt) || normalizedExcerpt.includes(normalizedTarget)) {
      return excerpt;
    }
  }

  if (excerpt) {
    return excerpt;
  }

  if (targetText) {
    return targetText.length > 96 ? `${targetText.slice(0, 93)}...` : targetText;
  }

  return suggestion.proposedPreview ?? suggestion.proposed;
}

function findSentenceIndexForSuggestion(paragraphSentences: string[], suggestion: SuggestionItem) {
  const normalizedTarget = normalizeForMatch(suggestion.targetText ?? "");
  const normalizedExcerpt = normalizeForMatch(suggestion.excerpt ?? "");

  const candidates = new Set<string>();
  if (normalizedTarget) {
    candidates.add(normalizedTarget);
    const words = normalizedTarget.split(" ").filter(Boolean);
    for (let length = Math.min(words.length, 10); length >= 3; length -= 1) {
      candidates.add(words.slice(0, length).join(" "));
    }
  }
  if (normalizedExcerpt) {
    candidates.add(normalizedExcerpt);
  }

  for (const candidate of candidates) {
    const exactMatchIndex = paragraphSentences.findIndex((sentence) => {
      const normalizedSentence = normalizeForMatch(sentence);
      return normalizedSentence.includes(candidate) || candidate.includes(normalizedSentence);
    });

    if (exactMatchIndex >= 0) {
      return exactMatchIndex;
    }
  }

  const targetWords = new Set(normalizedTarget.split(" ").filter(Boolean));
  let bestIndex = 0;
  let bestScore = -1;

  paragraphSentences.forEach((sentence, index) => {
    const words = normalizeForMatch(sentence).split(" ").filter(Boolean);
    const score = words.reduce((sum, word) => sum + (targetWords.has(word) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

type DiffToken = {
  text: string;
  type: "equal" | "removed" | "added";
  kind: "word" | "punct" | "space";
};

type DiffNode =
  | { type: "equal"; text: string }
  | { type: "insert"; text: string }
  | { type: "delete"; text: string }
  | { type: "replace"; oldText: string; newText: string };

type SentencePreview = {
  suggestionId: string;
  replacementText: string;
};

type DiffTokenized = {
  text: string;
  kind: "word" | "punct" | "space";
};

function tokenizeDiffText(value: string): DiffTokenized[] {
  const tokens = value.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
  return tokens.map((token) => {
    if (/^\s+$/.test(token)) {
      return { text: token, kind: "space" };
    }
    if (/^[\p{L}\p{N}]+$/u.test(token)) {
      return { text: token, kind: "word" };
    }
    return { text: token, kind: "punct" };
  });
}

function buildWordDiff(original: string, proposed: string) {
  const left = tokenizeDiffText(original);
  const right = tokenizeDiffText(proposed);
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      dp[leftIndex][rightIndex] =
        left[leftIndex].text === right[rightIndex].text
          ? dp[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(dp[leftIndex + 1][rightIndex], dp[leftIndex][rightIndex + 1]);
    }
  }

  const diff: DiffToken[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex].text === right[rightIndex].text) {
      diff.push({ text: left[leftIndex].text, type: "equal", kind: left[leftIndex].kind });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    if (dp[leftIndex + 1][rightIndex] >= dp[leftIndex][rightIndex + 1]) {
      diff.push({ text: left[leftIndex].text, type: "removed", kind: left[leftIndex].kind });
      leftIndex += 1;
    } else {
      diff.push({ text: right[rightIndex].text, type: "added", kind: right[rightIndex].kind });
      rightIndex += 1;
    }
  }

  while (leftIndex < left.length) {
    diff.push({ text: left[leftIndex].text, type: "removed", kind: left[leftIndex].kind });
    leftIndex += 1;
  }

  while (rightIndex < right.length) {
    diff.push({ text: right[rightIndex].text, type: "added", kind: right[rightIndex].kind });
    rightIndex += 1;
  }

  return diff;
}

function mergeAdjacentDiffTokens(tokens: DiffToken[]) {
  const merged: DiffToken[] = [];

  for (const token of tokens) {
    const last = merged[merged.length - 1];
    if (last && last.type === token.type) {
      last.text += token.text;
      continue;
    }

    merged.push({ ...token });
  }

  return merged;
}

function normalizeWhitespaceDiffTokens(tokens: DiffToken[]) {
  const output: DiffToken[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "equal" && token.kind === "space") {
      const previous = output[output.length - 1];
      if (previous && previous.type === token.type && previous.kind !== "space") {
        previous.text += token.text;
        continue;
      }

      let attached = false;
      for (let nextIndex = index + 1; nextIndex < tokens.length; nextIndex += 1) {
        const next = tokens[nextIndex];
        if (next.type === token.type && next.kind !== "space") {
          next.text = token.text + next.text;
          attached = true;
          break;
        }
      }

      if (attached) {
        continue;
      }

      if (token.type === "added") {
        output.push({ text: token.text, type: "equal", kind: "space" });
      }

      continue;
    }

    output.push({ ...token });
  }

  return mergeAdjacentDiffTokens(output);
}

function diffTokensToNodes(tokens: DiffToken[]): DiffNode[] {
  const nodes: DiffNode[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];

    if (token.type === "equal") {
      nodes.push({ type: "equal", text: token.text });
      continue;
    }

    if (token.type === "removed" && next?.type === "added") {
      nodes.push({ type: "replace", oldText: token.text, newText: next.text });
      index += 1;
      continue;
    }

    if (token.type === "removed") {
      nodes.push({ type: "delete", text: token.text });
      continue;
    }

    nodes.push({ type: "insert", text: token.text });
  }

  return nodes;
}

function mergeAdjacentNodes(nodes: DiffNode[]) {
  const merged: DiffNode[] = [];

  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (!last || last.type !== node.type) {
      merged.push({ ...node } as DiffNode);
      continue;
    }

    if (node.type === "equal" && last.type === "equal") {
      last.text += node.text;
      continue;
    }

    if (node.type === "insert" && last.type === "insert") {
      last.text += node.text;
      continue;
    }

    if (node.type === "delete" && last.type === "delete") {
      last.text += node.text;
      continue;
    }

    if (node.type === "replace" && last.type === "replace") {
      last.oldText += node.oldText;
      last.newText += node.newText;
      continue;
    }

    merged.push({ ...node } as DiffNode);
  }

  return merged;
}

function estimateSimilarity(tokens: DiffToken[]) {
  const common = tokens.filter((token) => token.type === "equal" && token.kind !== "space").length;
  const total = tokens.filter((token) => token.kind !== "space").length;
  return total === 0 ? 1 : common / total;
}

function shouldPreferWholeReplace(original: string, replacement: string, tokens: DiffToken[]) {
  const tokenCount = tokens.filter((token) => token.kind !== "space").length;
  const similarity = estimateSimilarity(tokens);
  if (tokenCount >= 8 && similarity < 0.3) {
    return true;
  }

  const lengthDiff = Math.abs(original.length - replacement.length);
  if (tokenCount >= 12 && lengthDiff > Math.max(original.length, replacement.length) * 0.4) {
    return true;
  }

  return false;
}

function getEditDistance(left: string, right: string) {
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= right.length; j += 1) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[left.length][right.length];
}

function refineReplaceNode(node: { oldText: string; newText: string }): DiffNode[] | null {
  if (/\s/.test(node.oldText) || /\s/.test(node.newText)) {
    return null;
  }
  if (node.oldText.length > 6 || node.newText.length > 6) {
    return null;
  }
  const distance = getEditDistance(node.oldText, node.newText);
  const maxLen = Math.max(node.oldText.length, node.newText.length);
  const similarity = maxLen === 0 ? 1 : 1 - distance / maxLen;
  if (distance > 2 || similarity < 0.6) {
    return null;
  }

  let prefixLen = 0;
  while (
    prefixLen < node.oldText.length &&
    prefixLen < node.newText.length &&
    node.oldText[prefixLen] === node.newText[prefixLen]
  ) {
    prefixLen += 1;
  }

  let suffixLen = 0;
  while (
    suffixLen < node.oldText.length - prefixLen &&
    suffixLen < node.newText.length - prefixLen &&
    node.oldText[node.oldText.length - 1 - suffixLen] === node.newText[node.newText.length - 1 - suffixLen]
  ) {
    suffixLen += 1;
  }

  const prefix = node.oldText.slice(0, prefixLen);
  const oldMiddle = node.oldText.slice(prefixLen, node.oldText.length - suffixLen);
  const newMiddle = node.newText.slice(prefixLen, node.newText.length - suffixLen);
  const suffix = node.oldText.slice(node.oldText.length - suffixLen);

  const refined: DiffNode[] = [];
  if (prefix) {
    refined.push({ type: "equal", text: prefix });
  }
  if (oldMiddle) {
    refined.push({ type: "delete", text: oldMiddle });
  }
  if (newMiddle) {
    refined.push({ type: "insert", text: newMiddle });
  }
  if (suffix) {
    refined.push({ type: "equal", text: suffix });
  }

  return refined.length ? refined : null;
}

function renderStructuredDiff(original: string, replacement: string) {
  const rawTokens = buildWordDiff(original, replacement);
  const normalizedTokens = normalizeWhitespaceDiffTokens(rawTokens);

  if (shouldPreferWholeReplace(original, replacement, normalizedTokens)) {
    // 大段重写时保留相同的开头/结尾，避免整句都被标红/标绿
    let prefixLen = 0;
    while (
      prefixLen < original.length &&
      prefixLen < replacement.length &&
      original[prefixLen] === replacement[prefixLen]
    ) {
      prefixLen += 1;
    }

    let suffixLen = 0;
    while (
      suffixLen < original.length - prefixLen &&
      suffixLen < replacement.length - prefixLen &&
      original[original.length - 1 - suffixLen] === replacement[replacement.length - 1 - suffixLen]
    ) {
      suffixLen += 1;
    }

    const prefix = original.slice(0, prefixLen);
    const oldMiddle = original.slice(prefixLen, original.length - suffixLen);
    const newMiddle = replacement.slice(prefixLen, replacement.length - suffixLen);
    const suffix = original.slice(original.length - suffixLen);

    const replacedOutput: ReactNode[] = [];
    if (prefix) {
      replacedOutput.push(<span key="replace-prefix">{prefix}</span>);
    }
    if (oldMiddle) {
      replacedOutput.push(
        <del key="replace-old" className="rounded-sm bg-red-50 px-0.5 py-0.5 text-red-950 decoration-red-400/70">
          {oldMiddle}
        </del>,
      );
    }
    if (newMiddle) {
      replacedOutput.push(
        <ins key="replace-new" className="rounded-sm bg-emerald-50 px-0.5 py-0.5 text-emerald-950 no-underline">
          {newMiddle}
        </ins>,
      );
    }
    if (suffix) {
      replacedOutput.push(<span key="replace-suffix">{suffix}</span>);
    }

    return replacedOutput;
  }

  const nodes = mergeAdjacentNodes(diffTokensToNodes(normalizedTokens));
  const output: ReactNode[] = [];

  nodes.forEach((node, index) => {
    if (node.type === "equal") {
      output.push(<span key={`equal-${index}`}>{node.text}</span>);
      return;
    }

    if (node.type === "delete") {
      output.push(
        <del key={`delete-${index}`} className="rounded-sm bg-red-50 px-0.5 py-0.5 text-red-950 decoration-red-400/70">
          {node.text}
        </del>,
      );
      return;
    }

    if (node.type === "insert") {
      output.push(
        <ins key={`insert-${index}`} className="rounded-sm bg-emerald-50 px-0.5 py-0.5 text-emerald-950 no-underline">
          {node.text}
        </ins>,
      );
      return;
    }

    const refined = refineReplaceNode(node);
    if (refined) {
      const refinedOutput = mergeAdjacentNodes(refined);
      refinedOutput.forEach((refinedNode, refinedIndex) => {
        const key = `refined-${index}-${refinedIndex}`;
        if (refinedNode.type === "equal") {
          output.push(<span key={key}>{refinedNode.text}</span>);
          return;
        }
        if (refinedNode.type === "delete") {
          output.push(
            <del key={key} className="rounded-sm bg-red-50 px-0.5 py-0.5 text-red-950 decoration-red-400/70">
              {refinedNode.text}
            </del>,
          );
          return;
        }
        if (refinedNode.type === "insert") {
          output.push(
            <ins key={key} className="rounded-sm bg-emerald-50 px-0.5 py-0.5 text-emerald-950 no-underline">
              {refinedNode.text}
            </ins>,
          );
        }
      });
      return;
    }

    output.push(
      <del key={`replace-old-${index}`} className="rounded-sm bg-red-50 px-0.5 py-0.5 text-red-950 decoration-red-400/70">
        {node.oldText}
      </del>,
    );
    output.push(
      <ins key={`replace-new-${index}`} className="rounded-sm bg-emerald-50 px-0.5 py-0.5 text-emerald-950 no-underline">
        {node.newText}
      </ins>,
    );
  });

  return output;
}

type SuggestionRange = {
  start: number;
  end: number;
  matched: string;
  prefixTokens: number;
  suffixTokens: number;
};

type SuggestionPatch = {
  id: string;
  start: number;
  end: number;
  replacementText: string;
};

function getTokenOffsets(tokens: { text: string }[]) {
  const offsets: number[] = [];
  let total = 0;
  tokens.forEach((token) => {
    total += token.text.length;
    offsets.push(total);
  });
  return offsets;
}

function buildSuggestionRange(sentence: string, suggestion: SuggestionItem): SuggestionRange | null {
  const sentenceTokens = tokenizeDiffText(sentence);
  const proposedTokens = tokenizeDiffText(suggestion.proposed);
  if (sentenceTokens.length === 0) {
    return null;
  }

  let prefix = 0;
  while (
    prefix < sentenceTokens.length &&
    prefix < proposedTokens.length &&
    sentenceTokens[prefix].text === proposedTokens[prefix].text
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < sentenceTokens.length - prefix &&
    suffix < proposedTokens.length - prefix &&
    sentenceTokens[sentenceTokens.length - 1 - suffix].text ===
    proposedTokens[proposedTokens.length - 1 - suffix].text
  ) {
    suffix += 1;
  }

  let startIndex = prefix;
  let endIndex = sentenceTokens.length - suffix;
  if (startIndex > endIndex) {
    startIndex = endIndex;
  }

  const offsets = getTokenOffsets(sentenceTokens);
  const startChar = startIndex === 0 ? 0 : offsets[startIndex - 1];
  const endChar = endIndex === 0 ? 0 : offsets[endIndex - 1];

  return {
    start: startChar,
    end: endChar,
    matched: sentence.slice(startChar, endChar),
    prefixTokens: prefix,
    suffixTokens: suffix,
  };
}

function getReplacementSegment(range: SuggestionRange, replacementText: string) {
  const tokens = tokenizeDiffText(replacementText);
  const startIndex = Math.min(range.prefixTokens, tokens.length);
  const endIndex = Math.max(startIndex, tokens.length - range.suffixTokens);
  return tokens.slice(startIndex, endIndex).map((token) => token.text).join("");
}

function buildAcceptedPatches(
  sentenceSuggestions: SuggestionItem[],
  resolvedMap: Record<string, "accept" | "reject" | "conflict">,
  acceptedOverrides: Record<string, string>,
  rangeById: Map<string, SuggestionRange>,
  excludeId?: string,
) {
  const patches: SuggestionPatch[] = [];

  sentenceSuggestions.forEach((suggestion) => {
    if (suggestion.id === excludeId) {
      return;
    }
    if (resolvedMap[suggestion.id] !== "accept") {
      return;
    }
    const range = rangeById.get(suggestion.id) ?? null;
    if (!range) {
      return;
    }
    const replacementText = getReplacementSegment(
      range,
      acceptedOverrides[suggestion.id] ?? suggestion.proposed,
    );
    patches.push({
      id: suggestion.id,
      start: range.start,
      end: range.end,
      replacementText,
    });
  });

  return patches.sort((a, b) => a.start - b.start);
}

function buildProposedSentencePreview(
  sentence: string,
  sentenceSuggestions: SuggestionItem[],
  suggestion: SuggestionItem,
  resolvedMap: Record<string, "accept" | "reject" | "conflict">,
  acceptedOverrides: Record<string, string>,
  rangeById: Map<string, SuggestionRange>,
) {
  const targetRange = rangeById.get(suggestion.id) ?? null;
  if (!targetRange) {
    return suggestion.proposed;
  }

  const patches = buildAcceptedPatches(sentenceSuggestions, resolvedMap, acceptedOverrides, rangeById, suggestion.id);
  const targetPatch: SuggestionPatch = {
    id: suggestion.id,
    start: targetRange.start,
    end: targetRange.end,
    replacementText: getReplacementSegment(targetRange, suggestion.proposed),
  };
  const allPatches = [...patches, targetPatch].sort((a, b) => a.start - b.start);
  return normalizeSentencePunctuation(applyPatchesToSentence(sentence, allPatches));
}

function applyPatchesToSentence(sentence: string, patches: SuggestionPatch[]) {
  if (patches.length === 0) {
    return sentence;
  }

  const parts: string[] = [];
  let cursor = 0;
  patches.forEach((patch) => {
    parts.push(sentence.slice(cursor, patch.start));
    parts.push(patch.replacementText);
    cursor = patch.end;
  });
  parts.push(sentence.slice(cursor));

  return parts.join("");
}

function normalizeSentencePunctuation(value: string) {
  return value.replace(/\.{2,}/g, ".");
}

function renderSentenceWithTargetDiff(
  sentence: string,
  patches: SuggestionPatch[],
  targetPatch: SuggestionPatch | null,
) {
  if (!targetPatch) {
    return applyPatchesToSentence(sentence, patches);
  }

  const allPatches = [...patches, targetPatch].sort((a, b) => a.start - b.start);
  const output: ReactNode[] = [];
  let cursor = 0;

  allPatches.forEach((patch) => {
    if (cursor < patch.start) {
      output.push(<span key={`seg-${cursor}`}>{sentence.slice(cursor, patch.start)}</span>);
    }

    if (patch.id === targetPatch.id) {
      const baseText = sentence.slice(patch.start, patch.end);
      output.push(<span key={`diff-${patch.id}`}>{renderStructuredDiff(baseText, patch.replacementText)}</span>);
    } else {
      output.push(<span key={`patch-${patch.id}`}>{patch.replacementText}</span>);
    }

    cursor = patch.end;
  });

  if (cursor < sentence.length) {
    output.push(<span key={`tail-${cursor}`}>{sentence.slice(cursor)}</span>);
  }

  return output;
}

function applyResolvedSuggestionsToSentence(
  sentence: string,
  sentenceSuggestions: SuggestionItem[],
  resolvedMap: Record<string, "accept" | "reject" | "conflict">,
  acceptedOverrides: Record<string, string>,
  rangeById: Map<string, SuggestionRange>,
) {
  const patches = buildAcceptedPatches(sentenceSuggestions, resolvedMap, acceptedOverrides, rangeById);
  return normalizeSentencePunctuation(applyPatchesToSentence(sentence, patches));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeExcerpt(value: string) {
  return value.replace(/^"+|"+$/g, "").replace(/^\.\.\./, "").replace(/\.\.\.$/, "").trim();
}

function renderFlaggedText(text: string, flaggedTokens: string[]) {
  return text.split(new RegExp(`(${flaggedTokens.map(escapeRegExp).join("|")})`, "g")).map((part, i) => {
    const flagged = flaggedTokens.includes(part);
    return flagged ? (
      <mark
        key={i}
        className="bg-transparent text-paper-foreground"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function renderParagraphWithHover(
  paragraph: string,
  flaggedTokens: string[],
  hoverPhrase: string | null,
  hoverColor: string | null,
) {
  const normalizedHover = hoverPhrase ? normalizeExcerpt(hoverPhrase) : "";
  if (!normalizedHover) {
    return renderFlaggedText(paragraph, flaggedTokens);
  }

  const regex = new RegExp(`(${escapeRegExp(normalizedHover)})`, "i");
  const match = paragraph.match(regex);
  if (!match || match.index == null) {
    return renderFlaggedText(paragraph, flaggedTokens);
  }

  const start = match.index;
  const end = start + match[0].length;
  const before = paragraph.slice(0, start);
  const concern = paragraph.slice(start, end);
  const after = paragraph.slice(end);

  return (
    <>
      {renderFlaggedText(before, flaggedTokens)}
      <mark
        className="rounded-sm px-0.5 py-0.5 text-paper-foreground"
        style={{
          backgroundColor: hoverColor ?? CATEGORY_COLORS["Sentence Flow"].lightSoft,
        }}
      >
        {concern}
      </mark>
      {renderFlaggedText(after, flaggedTokens)}
    </>
  );
}

function buildRefineVariations(category: string) {
  switch (category) {
    case "Tone":
      return [
        "Artificial intelligence has redefined academic authorship.",
        "Artificial intelligence has changed scholarly writing significantly.",
        "Artificial intelligence has redefined how scholars approach writing.",
      ];
    case "Sentence Flow":
      return [
        "The technology has evolved rapidly. It brings real opportunities and challenges.",
        "The technology has changed quickly, creating opportunities and trade-offs worth weighing.",
        "The technology has advanced at pace, and scholars are now balancing its benefits with its costs.",
      ];
    case "Word Choice":
      return [
        "...questions of authorship, originality, and honesty...",
        "...questions of authorship, originality, and integrity...",
        "...questions of authorship, originality, and responsibility...",
      ];
    case "Structure":
      return [
        "The integration of these tools has shifted academic writing in subtle but important ways.",
        "These tools are changing academic writing, but the implications are still unfolding.",
        "The tools are now part of the writing process, and the full effects are still emerging.",
      ];
    case "Punctuation":
      return [
        "The integration of these tools — quietly, over years — has blurred the boundaries...",
        "The integration of these tools, over time, has blurred the boundaries...",
        "The integration of these tools has blurred the boundaries between human creativity and machine assistance.",
      ];
    default:
      return [
        "The proposed wording stays close to the original while making the change more direct.",
        "This version keeps the meaning but tightens the phrasing.",
        "A slightly softer alternative that preserves the original intent.",
      ];
  }
}

export default function InfluenceDashboard() {
  const [dataset, setDataset] = useState<AuthorDnaDataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, "accept" | "reject" | "conflict">>({});
  const [acceptedOverrides, setAcceptedOverrides] = useState<Record<string, string>>({});
  const [refined, setRefined] = useState<Record<string, boolean>>({});
  const [activeRefineId, setActiveRefineId] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refineVariations, setRefineVariations] = useState<Record<string, string[]>>({});
  const [expandedSentences, setExpandedSentences] = useState<Record<string, boolean>>({});
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState<string | null>(null);
  const [hoveredPreview, setHoveredPreview] = useState<SentencePreview | null>(null);
  const [showAccepted, setShowAccepted] = useState<boolean>(true);
  const [showDismissed, setShowDismissed] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>("document");
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    let isMounted = true;

    loadAuthorDnaDataset()
      .then((nextDataset) => {
        if (!isMounted) {
          return;
        }

        setDataset(nextDataset);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setDataset(null);
        setLoadError(error instanceof Error ? error.message : "Failed to load AuthorDNA dataset");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = dataset?.metrics ?? [];
  const suggestions = dataset?.suggestions ?? [];
  const documentTitle = dataset?.document.title ?? "Writing in the age of AI";
  const documentParagraphs = dataset?.document.paragraphs ?? [];
  const sampleText = dataset?.sampleText ?? documentParagraphs.join("\n\n");

  const overall = useMemo(
    () => (metrics.length > 0 ? Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length) : 0),
    [metrics],
  );

  let visibleSuggestions = selectedCategory
    ? suggestions.filter((s) => s.category === selectedCategory)
    : suggestions;

  visibleSuggestions = visibleSuggestions.filter((s) => {
    const state = resolved[s.id];
    if (state === "accept") return showAccepted;
    if (state === "reject" || state === "conflict") return showDismissed;
    return true;
  });
  const hoveredSuggestion = suggestions.find((s) => s.id === hoveredSuggestionId) ?? null;
  const hoveredColor = hoveredSuggestion ? getCategoryColor(hoveredSuggestion.category) : null;
  const hoveredTarget = hoveredSuggestion?.targetText ?? null;
  const flaggedTokens = [
    "seems that",
    "perhaps",
    "proliferation",
    "unprecedented",
    "unimaginable",
    "Furthermore",
  ];
  const sentenceGroups = useMemo(() => {
    const paragraphSentenceLists = documentParagraphs.map((paragraph) => splitIntoSentences(paragraph));

    return paragraphSentenceLists.map((sentences, paragraphIndex) => {
      const sentenceSuggestions = suggestions
        .filter((suggestion) => suggestion.paragraphIndex === paragraphIndex)
        .map((suggestion) => ({
          suggestion,
          sentenceIndex: findSentenceIndexForSuggestion(sentences, suggestion),
        }));

      return sentences.map((sentence, sentenceIndex) => ({
        sentence,
        paragraphIndex,
        sentenceIndex,
        suggestions: sentenceSuggestions
          .filter((item) => item.sentenceIndex === sentenceIndex)
          .map((item) => item.suggestion),
      }));
    });
  }, [documentParagraphs, suggestions]);

  const sentenceSuggestionCount = sentenceGroups.reduce(
    (sum, paragraph) => sum + paragraph.reduce((inner, item) => inner + item.suggestions.length, 0),
    0,
  );

  const sentenceCount = sentenceGroups.reduce((sum, paragraph) => sum + paragraph.length, 0);

  const unresolvedCountBySentence = useMemo(() => {
    const map = new Map<string, number>();
    sentenceGroups.forEach((paragraph, paragraphIndex) => {
      paragraph.forEach((item) => {
        const key = `${paragraphIndex}-${item.sentenceIndex}`;
        const count = item.suggestions.reduce((c, s) => {
          const state = resolved[s.id];
          const isRefined = refined[s.id];
          return c + (state ? 0 : isRefined ? 0 : 1);
        }, 0);
        if (count > 0) {
          map.set(key, count);
        }
      });
    });
    return map;
  }, [sentenceGroups, resolved, refined]);

  const modifiedBySentence = useMemo(() => {
    const map = new Map<string, boolean>();
    sentenceGroups.forEach((paragraph, paragraphIndex) => {
      paragraph.forEach((item) => {
        const key = `${paragraphIndex}-${item.sentenceIndex}`;
        const anyAccepted = item.suggestions.some((s) => resolved[s.id] === "accept");
        if (anyAccepted) {
          map.set(key, true);
        }
      });
    });
    return map;
  }, [sentenceGroups, resolved]);

  const sentenceSuggestionIndex = useMemo(() => {
    const rangeById = new Map<string, SuggestionRange>();
    const conflictsById = new Map<string, string[]>();
    const sentenceContextById = new Map<string, { sentence: string; suggestions: SuggestionItem[] }>();
    const idToKey = new Map<string, string>();

    sentenceGroups.forEach((paragraph) => {
      paragraph.forEach((item) => {
        const ranges: { id: string; start: number; end: number }[] = [];

        item.suggestions.forEach((suggestion) => {
          sentenceContextById.set(suggestion.id, {
            sentence: item.sentence,
            suggestions: item.suggestions,
          });
          idToKey.set(suggestion.id, `${item.paragraphIndex}-${item.sentenceIndex}`);
          const range = buildSuggestionRange(item.sentence, suggestion);
          if (range) {
            rangeById.set(suggestion.id, range);
            ranges.push({ id: suggestion.id, start: range.start, end: range.end });
          }
        });

        for (let i = 0; i < ranges.length; i += 1) {
          for (let j = i + 1; j < ranges.length; j += 1) {
            const left = ranges[i];
            const right = ranges[j];
            const overlap = left.start < right.end && right.start < left.end;
            if (!overlap) {
              continue;
            }
            const leftConflicts = new Set(conflictsById.get(left.id) ?? []);
            leftConflicts.add(right.id);
            conflictsById.set(left.id, Array.from(leftConflicts));
            const rightConflicts = new Set(conflictsById.get(right.id) ?? []);
            rightConflicts.add(left.id);
            conflictsById.set(right.id, Array.from(rightConflicts));
          }
        }
      });
    });

    return { rangeById, conflictsById, sentenceContextById, idToKey };
  }, [sentenceGroups]);


  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-6 text-center text-sm text-ink-muted">
        <div>
          <div className="font-serif text-lg text-ink">Failed to load dataset</div>
          <div className="mt-2 max-w-md">{loadError}</div>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-6 text-center text-sm text-ink-muted">
        <div>
          <div className="font-serif text-lg text-ink">Loading AuthorDNA dataset</div>
          <div className="mt-2">Fetching standardized JSON from /data/author-dna-dataset.json</div>
        </div>
      </div>
    );
  }

  const handleRefineClick = (id: string) => {
    setActiveRefineId((current) => {
      const next = current === id ? null : id;
      if (next !== current) {
        setRefinePrompt("");
      }
      return next;
    });
  };

  const handleSubmitRefine = (id: string) => {
    const prompt = refinePrompt.trim();
    if (!prompt) {
      return;
    }
    setRefineVariations((current) => ({
      ...current,
      [id]: buildRefineVariations(suggestions.find((s) => s.id === id)?.category ?? ""),
    }));
    setRefined((current) => ({ ...current, [id]: true }));
  };

  const handleAcceptSuggestion = (id: string, replacementText?: string) => {
    const baseSuggestion = suggestions.find((s) => s.id === id) ?? null;
    const resolvedText = replacementText ?? baseSuggestion?.proposed ?? "";
    const conflictIds = sentenceSuggestionIndex.conflictsById.get(id) ?? [];

    setResolved((current) => {
      const next = { ...current, [id]: "accept" as const };
      conflictIds.forEach((conflictId) => {
        if (conflictId !== id) {
          next[conflictId] = "conflict";
        }
      });
      return next;
    });

    setAcceptedOverrides((current) => {
      const next = { ...current, [id]: resolvedText };
      conflictIds.forEach((conflictId) => {
        if (conflictId !== id) {
          delete next[conflictId];
        }
      });
      return next;
    });
    setRefined((current) => {
      if (!current[id]) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const handleDismissSuggestion = (id: string) => {
    setResolved((current) => ({ ...current, [id]: "reject" }));
    setAcceptedOverrides((current) => {
      if (!current[id]) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
    setRefined((current) => {
      if (!current[id]) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const handleRestoreSuggestion = (id: string) => {
    const conflictIds = sentenceSuggestionIndex.conflictsById.get(id) ?? [];

    setResolved((current) => {
      const next = { ...current };
      delete next[id];
      conflictIds.forEach((conflictId) => {
        if (next[conflictId] === "conflict") {
          delete next[conflictId];
        }
      });
      return next;
    });
    setAcceptedOverrides((current) => {
      if (!current[id]) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
    setRefined((current) => {
      if (!current[id]) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background pt-16">
      <AppHeader title={documentTitle} showBrandIcon={false}>
        <div className="hidden md:flex items-center gap-2">
          <div className="rounded-full border border-border bg-background p-1 text-[11px] text-ink-muted shadow-sm">
            <button
              type="button"
              onClick={() => {
                setViewMode("document");
                setActiveRefineId(null);
                setRefinePrompt("");
              }}
              className={cn(
                "rounded-full px-3 py-1 transition",
                viewMode === "document" ? "bg-brand text-brand-foreground" : "hover:text-ink",
              )}
            >
              Document
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("sentence");
                setActiveRefineId(null);
                setRefinePrompt("");
              }}
              className={cn(
                "rounded-full px-3 py-1 transition",
                viewMode === "sentence" ? "bg-brand text-brand-foreground" : "hover:text-ink",
              )}
            >
              Sentence view
            </button>
          </div>
          <span className="rounded-full bg-brand-muted px-2.5 py-1 text-brand">
            <Activity className="mr-1 inline h-3 w-3" />
            Live analysis
          </span>
        </div>
      </AppHeader>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* LEFT — A4 document */}
        <section className={cn("min-h-0 overflow-y-auto px-8 py-8", viewMode === "document" ? "overflow-x-auto" : "overflow-x-hidden", "bg-background")}>
          <div className={cn("mx-auto flex flex-col", viewMode === "document" ? "w-[816px] shrink-0" : "w-full max-w-none")}>
            <div className="mb-3" />

            {/* A4 page */}
            <div
              className={cn(
                viewMode === "document"
                  ? "relative rounded-sm border border-border bg-paper shadow-soft"
                  : "",
              )}
              style={viewMode === "document" ? { width: "816px", height: "1056px" } : undefined}
            >
              <div className={cn(viewMode === "document" ? "px-24 py-20" : "px-0 py-2")}>
                {viewMode === "document" ? (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="font-serif text-[16px] leading-[1.9] outline-none"
                    style={{ color: "var(--paper-foreground)" }}
                  >
                    {documentParagraphs.map((paragraph, paragraphIndex) => (
                      <p
                        key={paragraphIndex}
                        ref={(node) => {
                          paragraphRefs.current[paragraphIndex] = node;
                        }}
                        className={paragraphIndex === documentParagraphs.length - 1 ? "" : "mb-4"}
                      >
                        {renderParagraphWithHover(
                          paragraph,
                          flaggedTokens,
                          hoveredTarget,
                          hoveredColor ? hoveredColor.lightSoft : null,
                        )}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sentenceGroups.map((paragraph, paragraphIndex) => (
                      <div key={paragraphIndex} className="space-y-4">
                        {paragraph.map((item) => {
                          const currentSentence = applyResolvedSuggestionsToSentence(
                            item.sentence,
                            item.suggestions,
                            resolved,
                            acceptedOverrides,
                            sentenceSuggestionIndex.rangeById,
                          );
                          const previewSuggestion = hoveredPreview
                            ? item.suggestions.find((s) => s.id === hoveredPreview.suggestionId) ?? null
                            : null;
                          const previewRange = previewSuggestion
                            ? sentenceSuggestionIndex.rangeById.get(previewSuggestion.id) ?? null
                            : null;
                          const previewPatches = buildAcceptedPatches(
                            item.suggestions,
                            resolved,
                            acceptedOverrides,
                            sentenceSuggestionIndex.rangeById,
                            previewSuggestion?.id,
                          );
                          const sentenceText = previewSuggestion && previewRange
                            ? renderSentenceWithTargetDiff(item.sentence, previewPatches, {
                              id: previewSuggestion.id,
                              start: previewRange.start,
                              end: previewRange.end,
                              replacementText: getReplacementSegment(
                                previewRange,
                                hoveredPreview?.replacementText ?? previewSuggestion.proposed,
                              ),
                            })
                            : currentSentence;

                          const sentenceKey = `${paragraphIndex}-${item.sentenceIndex}`;
                          const unresolved = unresolvedCountBySentence.get(sentenceKey) ?? 0;
                          const isSentenceHovered = hoveredSuggestionId ? item.suggestions.some((s) => s.id === hoveredSuggestionId) : false;
                          const hoverCategoryColor = hoveredSuggestion ? getCategoryColor(hoveredSuggestion.category) : null;

                          return (
                            <div key={`${paragraphIndex}-${item.sentenceIndex}`} data-sentence-key={sentenceKey} className="space-y-3">
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  setExpandedSentences((prev) => ({ ...prev, [sentenceKey]: !prev[sentenceKey] }))
                                }
                                className="sticky top-[-2rem] z-40 rounded-xl border px-4 py-3 shadow-sm bg-background/95 backdrop-blur relative cursor-pointer"
                                style={
                                  isSentenceHovered && hoverCategoryColor
                                    ? { borderColor: hoverCategoryColor.fill, backgroundColor: hoverCategoryColor.soft }
                                    : { borderColor: undefined }
                                }
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <p className="font-serif text-[16px] leading-[1.9] text-ink">
                                    {sentenceText}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {modifiedBySentence.get(sentenceKey) && (
                                      <span
                                        className="text-amber-500 text-[12px] font-semibold leading-none opacity-70"
                                        style={{ backgroundColor: "transparent" }}
                                      >
                                        M
                                      </span>
                                    )}
                                    {unresolved > 0 && (
                                      <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-medium leading-none text-brand-foreground shadow-sm">
                                        {unresolved}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {item.suggestions.length > 0 && expandedSentences[sentenceKey] && (
                                <div className="space-y-3 pl-5 border-l border-border/70">
                                  {item.suggestions.map((suggestion) => {
                                    const categoryColor = getCategoryColor(suggestion.category);
                                    const state = resolved[suggestion.id];
                                    const isAccepted = state === "accept";
                                    const isRejected = state === "reject" || state === "conflict";
                                    const statusLabel =
                                      state === "accept"
                                        ? "Accepted"
                                        : state === "conflict"
                                          ? "Dismissed (Conflict)"
                                          : "Dismissed";

                                    return (
                                      <div
                                        key={suggestion.id}
                                        className={cn(
                                          "rounded-lg border p-3 shadow-soft transition",
                                          isAccepted && "border-brand/40 bg-brand-muted/30",
                                          isRejected && "border-border opacity-55 grayscale",
                                          !state && "border-border bg-background hover:border-brand/50",
                                          hoveredSuggestionId === suggestion.id && !state && "border-brand/50",
                                        )}
                                      >
                                        <div className="mb-2 flex items-center gap-2">
                                          <span
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{ backgroundColor: categoryColor.fill }}
                                          />
                                          <span className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                                            {suggestion.category}
                                          </span>
                                          {state && (
                                            <span className="ml-auto text-[10px] text-ink-muted">
                                              {statusLabel}
                                            </span>
                                          )}
                                        </div>
                                        <p className="mb-2 text-xs text-ink-muted">{suggestion.observation}</p>

                                        {!state ? (
                                          <>
                                            {(() => {
                                              return (
                                                <div
                                                  onMouseEnter={() => {
                                                    setHoveredSuggestionId(suggestion.id);
                                                    setHoveredPreview({ suggestionId: suggestion.id, replacementText: suggestion.proposed });
                                                  }}
                                                  onMouseLeave={() => {
                                                    setHoveredSuggestionId((current) => (current === suggestion.id ? null : current));
                                                    setHoveredPreview((current) => (current?.suggestionId === suggestion.id ? null : current));
                                                  }}
                                                  className={cn(
                                                    "rounded-md border border-dashed p-2.5 transition",
                                                    hoveredPreview?.suggestionId === suggestion.id
                                                      ? "border-emerald-300 bg-emerald-8/10"
                                                      : "border-border bg-paper/10",
                                                  )}
                                                >
                                                  <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-muted">Proposed</div>
                                                  <p className="font-serif text-[13px] leading-relaxed text-ink">
                                                    {suggestion.proposed}
                                                  </p>
                                                </div>
                                              );
                                            })()}
                                            <div className="mt-3 grid grid-cols-3 gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => handleAcceptSuggestion(suggestion.id)}
                                                className="flex items-center justify-center gap-1 rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-brand-foreground transition hover:opacity-90"
                                              >
                                                <Check className="h-3 w-3" /> Accept
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDismissSuggestion(suggestion.id)}
                                                className="flex items-center justify-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-ink transition hover:border-brand"
                                              >
                                                <X className="h-3 w-3" /> Dismiss
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleRefineClick(suggestion.id)}
                                                className={cn(
                                                  "flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs transition",
                                                  activeRefineId === suggestion.id
                                                    ? "border-brand bg-brand-muted/30 text-brand"
                                                    : "border-border bg-background text-ink hover:border-brand",
                                                )}
                                              >
                                                <Sparkles className="h-3 w-3" /> Refine
                                              </button>
                                            </div>

                                            {activeRefineId === suggestion.id && (
                                              <div className="mt-3 border-t border-border pt-3">
                                                <div className="mb-1">
                                                  <div className="font-serif text-sm font-medium text-ink">
                                                    Refine this suggestion
                                                  </div>
                                                  <div className="text-xs text-ink-muted">
                                                    Tell the AI how you'd like to adjust the proposed text.
                                                  </div>
                                                </div>

                                                <div className="relative rounded-md border border-border bg-background px-3 py-2">
                                                  <textarea
                                                    value={refinePrompt}
                                                    onChange={(e) => setRefinePrompt(e.target.value)}
                                                    placeholder="E.g., Make it more concise and natural, reduce the academic tone, …"
                                                    className="min-h-[56px] w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => handleSubmitRefine(suggestion.id)}
                                                    className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-brand transition hover:border-brand"
                                                    aria-label="Send refine prompt"
                                                  >
                                                    <Send className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>

                                                {refineVariations[suggestion.id] && (
                                                  <div className="mt-3">
                                                    <div className="mb-2 flex items-center justify-between gap-3">
                                                      <div>
                                                        <div className="font-serif text-sm font-medium text-ink">
                                                          Here are 3 variations
                                                        </div>
                                                        <div className="text-xs text-ink-muted">
                                                          Select the one that fits best, or refine further.
                                                        </div>
                                                      </div>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setRefineVariations((current) => ({
                                                            ...current,
                                                            [suggestion.id]: [
                                                              "Artificial intelligence has fundamentally changed how scholars write.",
                                                              "Artificial intelligence is changing academic writing at its core.",
                                                              "Artificial intelligence has transformed academic writing.",
                                                            ],
                                                          }))
                                                        }
                                                        className="flex items-center gap-1 text-xs text-ink-muted transition hover:text-ink"
                                                      >
                                                        <RotateCcw className="h-3 w-3" />
                                                        Regenerate
                                                      </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                      {refineVariations[suggestion.id].map((variation) => (
                                                        <div
                                                          key={variation}
                                                          onMouseEnter={() => {
                                                            setHoveredSuggestionId(suggestion.id);
                                                            setHoveredPreview({ suggestionId: suggestion.id, replacementText: variation });
                                                          }}
                                                          onMouseLeave={() => {
                                                            setHoveredPreview((current) =>
                                                              current?.suggestionId === suggestion.id && current.replacementText === variation
                                                                ? null
                                                                : current,
                                                            );
                                                          }}
                                                          className={cn(
                                                            "rounded-md border border-border bg-background px-3 py-2.5 transition",
                                                            hoveredPreview?.suggestionId === suggestion.id && hoveredPreview.replacementText === variation
                                                              ? "border-emerald-300 bg-emerald-50/70"
                                                              : "",
                                                          )}
                                                        >
                                                          <div className="min-w-0 flex-1">
                                                            <p className="font-serif text-[13px] leading-snug text-ink">
                                                              {buildProposedSentencePreview(
                                                                item.sentence,
                                                                item.suggestions,
                                                                { ...suggestion, proposed: variation },
                                                                resolved,
                                                                acceptedOverrides,
                                                                sentenceSuggestionIndex.rangeById,
                                                              )}
                                                            </p>
                                                          </div>
                                                          <button
                                                            type="button"
                                                            onClick={() => handleAcceptSuggestion(suggestion.id, variation)}
                                                            className="mt-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-ink transition hover:border-brand"
                                                          >
                                                            Accept
                                                          </button>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <div className={cn(
                                            "rounded-md border p-2.5 text-xs",
                                            isAccepted
                                              ? "border-brand/30 bg-brand-muted/20 text-ink"
                                              : "border-border text-ink-muted",
                                          )}>
                                            <div className="flex items-center justify-between gap-3">
                                              <span className="font-medium">
                                                {isAccepted ? "Applied to sentence" : statusLabel}
                                              </span>
                                              {state !== "conflict" && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleRestoreSuggestion(suggestion.id)}
                                                  className="flex items-center gap-1 text-[11px] font-medium text-ink-muted transition hover:text-ink"
                                                >
                                                  <RotateCcw className="h-3 w-3" /> Restore
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>


            </div>

          </div>
          <div className="sticky bottom-4 left-0 z-50 mt-6 flex w-full justify-center pointer-events-none">
            <div className="pointer-events-auto inline-flex  items-center justify-center rounded-full border border-border/70 bg-card/80 px-5 py-3 text-xs text-foreground shadow-soft backdrop-blur">
              <div className="flex items-center justify-center gap-4 text-center">
                <span>{sampleText.split(/\s+/).length} words</span>
                <span className="opacity-60">·</span>
                <span>{`${sentenceSuggestionCount} mapped suggestions`}</span>
                <span className="opacity-60">·</span>
                <span>{viewMode === "document" ?   `Page 1 of 1`: `${sentenceCount} sentences`}</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT — Influence Index + Suggestions */}
        <aside className="min-h-0 overflow-y-auto border-l border-border bg-background/80">
          {/* Influence Index */}
          <div className="border-b border-border p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-serif text-[22px] text-ink">DNA Alignment</h2>
              <span className="font-serif text-[22px] leading-none text-ink">{overall}</span>
            </div>
            <div className="mb-3">
              <MetricBar score={overall} />
            </div>
            <button
              type="button"
              onClick={() =>
                setShowBreakdown((current) => {
                  const next = !current;
                  if (!next) {
                    setSelectedCategory(null);
                  }
                  return next;
                })
              }
              className="flex items-center gap-1 text-xs text-ink-muted transition hover:text-ink"
            >
              {showBreakdown ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Hide breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  View breakdown
                </>
              )}
            </button>
            {showBreakdown && (
              <>
                <div className="my-4 border-b border-border/70" />
                <div className="space-y-2.5">
                  {metrics.map((m) => (
                    <div key={m.id}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-ink">{m.name}</span>
                        <span className="font-serif text-xs tabular-nums text-ink-muted">
                          {m.score}
                        </span>
                      </div>
                      <MetricBar
                        score={m.score}
                        fillColor={getCategoryColor(m.name).fill}
                        trackColor={getCategoryColor(m.name).soft}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-border/70 pt-4">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-ink-muted">
                    Filter suggestions
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] transition",
                        selectedCategory === null
                          ? "border-brand bg-brand-muted/20 text-ink"
                          : "border-border bg-background text-ink-muted hover:text-ink",
                      )}
                    >
                      All
                    </button>
                    {metrics.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedCategory(m.name)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] transition",
                          selectedCategory === m.name ? "text-ink" : "text-ink-muted hover:text-ink",
                        )}
                        style={{
                          borderColor:
                            selectedCategory === m.name
                              ? getCategoryColor(m.name).fill
                              : getCategoryColor(m.name).soft,
                          backgroundColor:
                            selectedCategory === m.name ? getCategoryColor(m.name).soft : "transparent",
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Suggestions — scrollable */}
          <div>
            <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
              <h3 className="font-serif text-sm text-ink">
                Suggestions <span className="text-ink-muted">· {visibleSuggestions.length}</span>
              </h3>
              <div className="flex items-center gap-3">
                <div className="text-xs text-ink-muted">Show:</div>
                <label className="inline-flex items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-border bg-background"
                    checked={showAccepted}
                    onChange={(e) => setShowAccepted(e.target.checked)}
                  />
                  <span className="text-xs">Accepted</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border border-border bg-background"
                    checked={showDismissed}
                    onChange={(e) => setShowDismissed(e.target.checked)}
                  />
                  <span className="text-xs">Dismissed</span>
                </label>
              </div>
            </div>
            <div className="space-y-2.5 p-4">
              {visibleSuggestions.map((s) => {
                const state = resolved[s.id];
                const statusLabel =
                  state === "accept"
                    ? "Accepted"
                    : state === "conflict"
                      ? "Dismissed (Conflict)"
                      : "Dismissed";
                const categoryColor = getCategoryColor(s.category);
                const sentenceContext = sentenceSuggestionIndex.sentenceContextById.get(s.id) ?? null;
                const proposedSentence = sentenceContext
                  ? buildProposedSentencePreview(
                    sentenceContext.sentence,
                    sentenceContext.suggestions,
                    s,
                    resolved,
                    acceptedOverrides,
                    sentenceSuggestionIndex.rangeById,
                  )
                  : s.proposedPreview ?? s.proposed;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-lg border p-3.5 transition-all",
                      state === "accept" && "border-brand/40 bg-brand-muted/30",
                      (state === "reject" || state === "conflict") && "opacity-60",
                      !state && "border-border bg-background hover:border-brand/40",
                    )}
                    onMouseEnter={() => {
                      if (state) return;
                      setHoveredSuggestionId(s.id);
                      setHoveredPreview({ suggestionId: s.id, replacementText: s.proposedPreview ?? s.proposed });
                      const key = sentenceSuggestionIndex.idToKey?.get(s.id);
                      if (key) {
                        window.requestAnimationFrame(() => {
                          const el = document.querySelector(`[data-sentence-key="${key}"]`);
                          (el as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "center" });
                        });
                      } else {
                        const paragraphIndex = s.paragraphIndex ?? 0;
                        window.requestAnimationFrame(() => {
                          paragraphRefs.current[paragraphIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredSuggestionId((current) => (current === s.id ? null : current));
                      setHoveredPreview((current) => (current?.suggestionId === s.id ? null : current));
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: categoryColor.fill }} />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                        {s.category}
                      </span>
                      {state && (
                        <span className="ml-auto text-[10px] text-ink-muted">
                          {statusLabel}
                        </span>
                      )}
                    </div>
                    <p className="mb-2 line-clamp-2 text-xs italic text-ink-muted">"{getSuggestionExcerpt(s)}"</p>
                    <p className="mb-2.5 text-xs text-ink">{s.observation}</p>

                    <div
                      className={cn(
                        "mb-2.5 rounded-md border border-dashed p-2.5 transition",
                        hoveredSuggestionId === s.id ? "border-emerald-300" : "border-border bg-paper/10",
                      )}
                    >
                      <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-muted">
                        Proposed
                      </div>
                      <p className="font-serif text-[13px] leading-relaxed text-ink">
                        {proposedSentence}
                      </p>
                    </div>

                    {!state && (
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => handleAcceptSuggestion(s.id)}
                          className="flex items-center justify-center gap-1 rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-brand-foreground transition hover:opacity-90"
                        >
                          <Check className="h-3 w-3" /> Accept
                        </button>
                        <button
                          onClick={() => handleDismissSuggestion(s.id)}
                          className="flex items-center justify-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-ink transition hover:border-brand"
                        >
                          <X className="h-3 w-3" /> Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRefineClick(s.id)}
                          className={cn(
                            "flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs transition",
                            activeRefineId === s.id
                              ? "border-brand text-brand bg-brand-muted/30"
                              : "border-border bg-background text-ink hover:border-brand",
                          )}
                        >
                          <Sparkles className="h-3 w-3" /> Refine
                        </button>
                      </div>
                    )}

                    {state && (
                      <div className="mt-2 flex items-center justify-between rounded-md border border-border/60 px-2.5 py-2 text-[11px] text-ink-muted">
                        <span>{state === "accept" ? "Applied" : statusLabel}</span>
                        {state !== "conflict" && (
                          <button
                            type="button"
                            onClick={() => handleRestoreSuggestion(s.id)}
                            className="flex items-center gap-1 font-medium text-ink-muted transition hover:text-ink"
                          >
                            <RotateCcw className="h-3 w-3" /> Restore
                          </button>
                        )}
                      </div>
                    )}

                    {viewMode === "document" && activeRefineId === s.id && (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className="mb-1">
                          <div className="font-serif text-sm font-medium text-ink">
                            Refine this suggestion
                          </div>
                          <div className="text-xs text-ink-muted">
                            Tell the AI how you'd like to adjust the proposed text.
                          </div>
                        </div>

                        <div className="relative rounded-md border border-border bg-background px-3 py-2">
                          <textarea
                            value={refinePrompt}
                            onChange={(e) => setRefinePrompt(e.target.value)}
                            placeholder="E.g., Make it more concise and natural, reduce the academic tone, …"
                            className="min-h-[56px] w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/70"
                          />
                          <button
                            type="button"
                            onClick={() => handleSubmitRefine(s.id)}
                            className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-brand transition hover:border-brand"
                            aria-label="Send refine prompt"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {refineVariations[s.id] && (
                          <div className="mt-3">
                            <div className="mb-2 flex items-center justify-between">
                              <div>
                                <div className="font-serif text-sm font-medium text-ink">
                                  Here are 3 variations
                                </div>
                                <div className="text-xs text-ink-muted">
                                  Select the one that fits best, or refine further.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setRefineVariations((current) => ({
                                    ...current,
                                    [s.id]: [
                                      "Artificial intelligence has fundamentally changed how scholars write.",
                                      "Artificial intelligence is changing academic writing at its core.",
                                      "Artificial intelligence has transformed academic writing.",
                                    ],
                                  }))
                                }
                                className="flex items-center gap-1 text-xs text-ink-muted transition hover:text-ink"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Regenerate
                              </button>
                            </div>

                            <div className="space-y-2">
                              {refineVariations[s.id].map((variation) => (
                                <div
                                  key={variation}
                                  className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-serif text-[13px] leading-snug text-ink">
                                      {sentenceContext
                                        ? buildProposedSentencePreview(
                                          sentenceContext.sentence,
                                          sentenceContext.suggestions,
                                          { ...s, proposed: variation },
                                          resolved,
                                          acceptedOverrides,
                                          sentenceSuggestionIndex.rangeById,
                                        )
                                        : variation}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptSuggestion(s.id, variation)}
                                    className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-ink transition hover:border-brand"
                                  >
                                    Accept
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

