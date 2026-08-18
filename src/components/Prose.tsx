import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Linking } from "react-native";
import { type Block, type InlineRun } from "../data/manuel";
import { colors } from "../theme/colors";

export type ProseLinkHandler = (run: InlineRun) => void;

function Run({ run, onLink }: { run: InlineRun; onLink: ProseLinkHandler }) {
  const style = [
    styles.text,
    run.bold && styles.bold,
    run.italic && styles.italic,
    run.underline && styles.underline,
    run.type === "link" && styles.link,
  ];
  if (run.type === "link") {
    return (
      <Text
        style={style}
        onPress={() =>
          run.kind === "external" && run.target
            ? Linking.openURL(run.target)
            : onLink(run)
        }
      >
        {run.text}
      </Text>
    );
  }
  return <Text style={style}>{run.text}</Text>;
}

function RunsText({
  runs,
  onLink,
  base,
}: {
  runs: InlineRun[];
  onLink: ProseLinkHandler;
  base?: object;
}) {
  return (
    <Text style={base}>
      {runs.map((r, i) => (
        <Run key={i} run={r} onLink={onLink} />
      ))}
    </Text>
  );
}

function BlockView({ block, onLink }: { block: Block; onLink: ProseLinkHandler }) {
  switch (block.type) {
    case "heading":
      return (
        <RunsText
          runs={block.runs}
          onLink={onLink}
          base={block.level === 2 ? styles.h2 : styles.h3}
        />
      );
    case "paragraph":
      return <RunsText runs={block.runs} onLink={onLink} base={styles.p} />;
    case "blockquote":
      return (
        <View style={styles.blockquote}>
          <RunsText runs={block.runs} onLink={onLink} base={styles.blockquoteText} />
        </View>
      );
    case "list":
      return (
        <View style={styles.list}>
          {block.items.map((itemRuns, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.bullet}>
                {block.ordered ? `${i + 1}.` : "•"}
              </Text>
              <RunsText runs={itemRuns} onLink={onLink} base={styles.listText} />
            </View>
          ))}
        </View>
      );
    case "aside":
      return (
        <View style={styles.aside}>
          {block.title ? <Text style={styles.asideTitle}>{block.title}</Text> : null}
          <Prose blocks={block.blocks} onLink={onLink} collapsible={false} />
        </View>
      );
    default:
      return null;
  }
}

function runsPlain(runs: InlineRun[]): string {
  return runs.map((r) => r.text).join("").trim();
}

type Section = {
  heading: Extract<Block, { type: "heading" }> | null;
  body: Block[];
};

/**
 * Certains paragraphes ("Pour les concours et examens", "Dans les
 * publications du Conseil d'État…") sont des rappels pédagogiques
 * récurrents, rédigés en tête de paragraphe en gras plutôt que comme un
 * vrai titre. Sans traitement particulier, ils tombent dans le corps du
 * dépliant précédent au lieu de former leur propre section. On les
 * détecte pour leur donner un accordéon autonome, comme un titre.
 */
const CALLOUT_LEADS = ["Pour les concours et examens", "Dans les publications du Conseil d'État"];

function normalizeApostrophes(text: string): string {
  return text.replace(/['’]/g, "'");
}

function calloutLeadRun(block: Block): InlineRun | null {
  if (block.type !== "paragraph" || !block.runs.length) return null;
  const first = block.runs[0];
  if (!first.bold) return null;
  const text = normalizeApostrophes(first.text).replace(/[\s:]+$/, "");
  return CALLOUT_LEADS.some((lead) => text.startsWith(lead)) ? first : null;
}

/** Découpe le prose en sections sous chaque titre (h2/h3) ou rappel pédagogique, pour dépliants. */
function splitIntoSections(blocks: Block[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, body: [] };
  for (const b of blocks) {
    if (b.type === "heading") {
      if (current.heading || current.body.length) sections.push(current);
      current = { heading: b, body: [] };
      continue;
    }
    const lead = calloutLeadRun(b);
    if (lead) {
      if (current.heading || current.body.length) sections.push(current);
      const rest = (b as Extract<Block, { type: "paragraph" }>).runs.slice(1);
      if (rest.length) rest[0] = { ...rest[0], text: rest[0].text.replace(/^[\s:]+/, "") };
      current = {
        heading: { type: "heading", level: 3, runs: [lead] },
        body: rest.length ? [{ type: "paragraph", runs: rest }] : [],
      };
      continue;
    }
    current.body.push(b);
  }
  if (current.heading || current.body.length) sections.push(current);
  return sections;
}

function CollapsibleSection({
  heading,
  body,
  onLink,
}: {
  heading: Extract<Block, { type: "heading" }>;
  body: Block[];
  onLink: ProseLinkHandler;
}) {
  const [open, setOpen] = useState(false);
  const title = runsPlain(heading.runs) || "Section";
  return (
    <View style={styles.collapse}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.collapseHead}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.collapseChevron, open && styles.collapseChevronOpen]}>
          ▾
        </Text>
        <Text
          style={heading.level === 2 ? styles.collapseH2 : styles.collapseH3}
        >
          {title}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.collapseBody}>
          {body.map((b, i) => (
            <BlockView key={i} block={b} onLink={onLink} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * @param collapsible — titres h2/h3 en dépliants (fermés par défaut).
 */
export function Prose({
  blocks,
  onLink,
  collapsible = true,
}: {
  blocks: Block[];
  onLink: ProseLinkHandler;
  collapsible?: boolean;
}) {
  const sections = useMemo(() => splitIntoSections(blocks), [blocks]);

  if (!collapsible) {
    return (
      <>
        {blocks.map((b, i) => (
          <BlockView key={i} block={b} onLink={onLink} />
        ))}
      </>
    );
  }

  return (
    <>
      {sections.map((sec, i) => {
        if (!sec.heading) {
          return (
            <View key={`pre-${i}`}>
              {sec.body.map((b, j) => (
                <BlockView key={j} block={b} onLink={onLink} />
              ))}
            </View>
          );
        }
        return (
          <CollapsibleSection
            key={`sec-${i}`}
            heading={sec.heading}
            body={sec.body}
            onLink={onLink}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.versoText, fontSize: 14, lineHeight: 21 },
  bold: { fontWeight: "700", color: colors.ink },
  italic: { fontStyle: "italic" },
  underline: { textDecorationLine: "underline" },
  link: { color: colors.accent, fontWeight: "600" },
  h2: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 18,
    marginBottom: 8,
    fontFamily: "serif",
  },
  h3: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 14,
    marginBottom: 6,
  },
  p: { marginBottom: 10 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: 12,
    marginBottom: 10,
  },
  blockquoteText: { fontStyle: "italic", color: colors.muted },
  list: { marginBottom: 10, gap: 4 },
  listRow: { flexDirection: "row", gap: 6 },
  bullet: { color: colors.accent, fontWeight: "700", fontSize: 14 },
  listText: { flex: 1 },
  aside: {
    backgroundColor: colors.accentSoft,
    borderRadius: colors.radius,
    padding: 12,
    marginBottom: 12,
  },
  asideTitle: { fontWeight: "700", color: colors.ink, marginBottom: 6, fontSize: 13 },
  collapse: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 2,
  },
  collapseHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 12,
  },
  collapseChevron: {
    fontSize: 14,
    color: colors.ink,
    width: 16,
    marginTop: 2,
    transform: [{ rotate: "-90deg" }],
  },
  collapseChevronOpen: { transform: [{ rotate: "0deg" }] },
  collapseH2: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
    fontFamily: "serif",
    lineHeight: 22,
  },
  collapseH3: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 20,
  },
  collapseBody: { paddingLeft: 24, paddingBottom: 12 },
});
