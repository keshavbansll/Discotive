import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Polygon,
  Line,
  Circle,
  Font,
} from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

// ============================================================================
// DCI STRICT ATS-NATIVE STYLESHEET (Pure Black & White, High Contrast)
// ============================================================================
const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },

  // Header section
  headerArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "3pt solid #000000",
    paddingBottom: 15,
    marginBottom: 20,
  },
  identity: { flex: 1 },
  name: {
    fontSize: 28,
    fontWeight: "heavy",
    color: "#000000",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  email: {
    fontSize: 10,
    color: "#000000",
    fontFamily: "Helvetica-Oblique",
    marginBottom: 8,
  },
  badgesRow: { flexDirection: "row", gap: 10 },
  badge: {
    border: "1pt solid #000000",
    padding: "4 8",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  // Core Metrics
  metricsArea: { flexDirection: "row", gap: 20, alignItems: "flex-end" },
  metricBox: { alignItems: "flex-end" },
  metricLabel: {
    fontSize: 8,
    color: "#555555",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  metricValue: { fontSize: 20, fontWeight: "bold", color: "#000000" },

  // Grid Layout
  grid: { flexDirection: "row", gap: 20 },
  col4: { width: "35%", flexDirection: "column", gap: 20 },
  col8: { width: "65%", flexDirection: "column", gap: 20 },

  // Section Blocks
  section: { border: "1pt solid #000000", padding: 15 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "1pt solid #E5E5E5",
    paddingBottom: 8,
    marginBottom: 12,
  },

  // Data Rows
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1pt solid #E5E5E5",
    paddingBottom: 6,
    marginBottom: 6,
  },
  dataLabel: { fontSize: 9, color: "#000000", fontWeight: "bold" },
  dataValue: { fontSize: 12, color: "#000000", fontWeight: "bold" },

  // Text Elements
  paragraph: {
    fontSize: 9,
    color: "#333333",
    lineHeight: 1.5,
    marginBottom: 8,
  },
  boldText: { fontWeight: "bold", color: "#000000" },

  // Pills (Skills)
  pillContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    border: "1pt solid #555555",
    padding: "4 6",
    fontSize: 8,
    fontWeight: "bold",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1pt solid #000000",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});

// --- ATS PDF DOCUMENT COMPONENT ---
export const DCIExportTemplate = ({
  data,
  level,
  skills,
  assetsCount,
  alliesCount,
}) => {
  // Radar Chart Math (Scaled for PDF Svg)
  const rScore = Math.min((data.score / 5000) * 100, 100);
  const rSkills = Math.min((skills.length / 10) * 100, 100);
  const rAllies = Math.min((alliesCount / 20) * 100, 100);
  const rAssets = Math.min((assetsCount / 5) * 100, 100);
  const rStreak = Math.min((data.streak / 30) * 100, 100);

  const rawValues = [rScore, rSkills, rAllies, rAssets, rStreak];
  const points = rawValues
    .map((val, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return `${50 + (val / 100) * 40 * Math.cos(angle)},${50 + (val / 100) * 40 * Math.sin(angle)}`;
    })
    .join(" ");

  // Background Web generator
  const webLines = [20, 40].map((r) => {
    return [0, 1, 2, 3, 4]
      .map((i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
      })
      .join(" ");
  });

  return (
    <Document
      title={`${data.firstName}_${data.lastName}_DCI.pdf`}
      author="Discotive Protocol"
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER: OPERATOR IDENTITY */}
        <View style={styles.headerArea}>
          <View style={styles.identity}>
            <Text style={styles.name}>
              {data.firstName} {data.lastName}
            </Text>
            <Text style={styles.email}>Verified Comm Link: {data.email}</Text>
            <View style={styles.badgesRow}>
              <Text style={styles.badge}>
                {data.domain} • {data.niche}
              </Text>
              <Text style={styles.badge}>LEVEL {level} OPERATOR</Text>
            </View>
          </View>

          <View style={styles.metricsArea}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Global Rank</Text>
              <Text style={styles.metricValue}>#{data.rank || "--"}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Discotive Score</Text>
              <Text style={styles.metricValue}>
                {data.score.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* GRID LAYOUT */}
        <View style={styles.grid}>
          {/* LEFT COLUMN: Telemetry & Capabilities */}
          <View style={styles.col4}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Execution Telemetry</Text>

              {/* ATS-Native Vector Radar Chart */}
              <View
                style={{ alignItems: "center", marginBottom: 15, height: 120 }}
              >
                <Svg viewBox="0 0 100 100" width="100" height="100">
                  {/* Radar Webs (Now Black) */}
                  {webLines.map((points, idx) => (
                    <Polygon
                      key={idx}
                      points={points}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeOpacity={0.2}
                    />
                  ))}
                  {/* Data Polygon */}
                  <Polygon
                    points={points}
                    fill="#000000"
                    fillOpacity="0.1"
                    stroke="#000000"
                    strokeWidth="1.5"
                  />

                  {/* Axis Lines for Structure (Now Black) */}
                  <Line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="10"
                    stroke="#000000"
                    strokeWidth="0.5"
                    strokeOpacity={0.2}
                  />
                  <Line
                    x1="50"
                    y1="50"
                    x2="88"
                    y2="38"
                    stroke="#000000"
                    strokeWidth="0.5"
                    strokeOpacity={0.2}
                  />
                  <Line
                    x1="50"
                    y1="50"
                    x2="73"
                    y2="82"
                    stroke="#000000"
                    strokeWidth="0.5"
                    strokeOpacity={0.2}
                  />
                  <Line
                    x1="50"
                    y1="50"
                    x2="27"
                    y2="82"
                    stroke="#000000"
                    strokeWidth="0.5"
                    strokeOpacity={0.2}
                  />
                  <Line
                    x1="50"
                    y1="50"
                    x2="12"
                    y2="38"
                    stroke="#000000"
                    strokeWidth="0.5"
                    strokeOpacity={0.2}
                  />
                </Svg>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Verified Assets</Text>
                <Text style={styles.dataValue}>{assetsCount}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Network Allies</Text>
                <Text style={styles.dataValue}>{alliesCount}</Text>
              </View>
              <View
                style={[
                  styles.dataRow,
                  { borderBottom: "none", marginBottom: 0 },
                ]}
              >
                <Text style={styles.dataLabel}>Consistency Streak</Text>
                <Text style={styles.dataValue}>{data.streak} Days</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Capabilities Inventory</Text>
              <View style={styles.pillContainer}>
                {skills.length > 0 ? (
                  skills.map((s, i) => (
                    <Text key={i} style={styles.pill}>
                      {s}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.paragraph}>[ NULL_INVENTORY ]</Text>
                )}
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN: Ledger & Trajectory */}
          <View style={styles.col8}>
            {/* OPERATOR SYNTHESIS (Dynamic Data Analysis) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Operator Synthesis</Text>
              <Text style={styles.paragraph}>
                <Text style={styles.boldText}>Trajectory Analysis: </Text>
                {data.firstName} is a Level {level} Operator specializing in{" "}
                {data.domain}. With a Discotive Score of{" "}
                {data.score.toLocaleString()}, this profile indicates a
                compounding trajectory in {data.niche}. The operator has
                currently secured {assetsCount} verified assets on the protocol
                and actively maintains a network of {alliesCount} allies.
              </Text>
            </View>

            {/* THE EXECUTION LEDGER (Vault Assets) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Execution Ledger (Verified Deployments)
              </Text>
              {assetsCount > 0 ? (
                <View>
                  <View
                    style={{
                      marginBottom: 10,
                      borderBottom: "1pt dotted #E5E5E5",
                      paddingBottom: 5,
                    }}
                  >
                    <Text style={[styles.dataLabel, { fontSize: 10 }]}>
                      1. Discotive Core Ecosystem
                    </Text>
                    <Text style={styles.paragraph}>
                      Deployed React/Firebase architecture. Impact: Scaled
                      platform infrastructure to support high-density operator
                      routing.
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.paragraph,
                      { fontStyle: "italic", color: "#888" },
                    ]}
                  >
                    + {assetsCount - 1} additional verified assets on chain.
                  </Text>
                </View>
              ) : (
                <Text style={styles.paragraph}>
                  [ NO_VERIFIED_ASSETS_ON_CHAIN ]
                </Text>
              )}
            </View>

            {/* TRAJECTORY & ACADEMICS */}
            <View style={{ flexDirection: "row", gap: 20 }}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.sectionTitle}>Trajectory</Text>
                <Text style={[styles.dataLabel, { marginBottom: 2 }]}>
                  Current Target:
                </Text>
                <Text style={styles.paragraph}>
                  {data.goal || "Establishing baseline."}
                </Text>
                <Text
                  style={[styles.dataLabel, { marginBottom: 2, marginTop: 4 }]}
                >
                  Macro Endgame:
                </Text>
                <Text style={styles.paragraph}>
                  {data.endgame || "Scaling monopoly."}
                </Text>
              </View>

              {data.institution && (
                <View style={[styles.section, { flex: 1 }]}>
                  <Text style={styles.sectionTitle}>Academic Baseline</Text>
                  <Text
                    style={[styles.boldText, { fontSize: 12, marginBottom: 2 }]}
                  >
                    {data.institution}
                  </Text>
                  <Text style={[styles.paragraph, { marginBottom: 2 }]}>
                    {data.degree} • {data.major}
                  </Text>
                  <Text
                    style={[
                      styles.paragraph,
                      { color: "#666", marginBottom: 6 },
                    ]}
                  >
                    Timeline: 2024 — {data.gradYear || "Present"}
                  </Text>
                  {data.gradYear && (
                    <Text
                      style={[
                        styles.badge,
                        { alignSelf: "flex-start", marginTop: 4 },
                      ]}
                    >
                      CLASS OF {data.gradYear}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DISCOTIVE CAREER INDEX (DCI) • CONFIDENTIAL
          </Text>
          <Text style={styles.footerText}>VERIFIED ON DISCOTIVE PROTOCOL</Text>
        </View>
      </Page>
    </Document>
  );
};
