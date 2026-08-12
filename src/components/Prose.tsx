import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
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

function RunsText({ runs, onLink, base }: { runs: InlineRun[]; onLink: ProseLinkHandler; base?: object }) {
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
          {block.items.map((runs, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.bullet}>
                {block.ordered ? `${i + 1}.` : "•"}
              </Text>
              <RunsText runs={runs} onLink={onLink} base={styles.listText} />
            </View>
          ))}
        </View>
      );
    case "aside":
      return (
        <View style={styles.aside}>
          {block.title ? <Text style={styles.asideTitle}>{block.title}</Text> : null}
          <Prose blocks={block.blocks} onLink={onLink} />
        </View>
      );
    default:
      return null;
  }
}

export function Prose({ blocks, onLink }: { blocks: Block[]; onLink: ProseLinkHandler }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} onLink={onLink} />
      ))}
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
});
