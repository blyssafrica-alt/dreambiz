import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  showLabels?: boolean;
  showLegend?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_SIZE = Math.min(SCREEN_WIDTH - 80, 200);

export default function PieChart({
  data,
  size = DEFAULT_SIZE,
  showLabels = true,
  showLegend = true,
}: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const center = size / 2;
  const radius = (size - 40) / 2;
  let currentAngle = -90; // Start from top

  const paths = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    const labelAngle = (startAngle + endAngle) / 2;
    const labelRadius = radius * 0.7;
    const labelX = center + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
    const labelY = center + labelRadius * Math.sin((labelAngle * Math.PI) / 180);

    currentAngle = endAngle;

    return {
      path: pathData,
      color: item.color,
      label: item.label,
      percentage,
      labelX,
      labelY,
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G>
          {paths.map((path, index) => (
            <Path
              key={index}
              d={path.path}
              fill={path.color}
              stroke="#FFF"
              strokeWidth="2"
            />
          ))}
          {showLabels &&
            paths.map((path, index) => {
              if (path.percentage < 0.05) return null; // Don't show labels for very small slices
              return (
                <SvgText
                  key={index}
                  x={path.labelX}
                  y={path.labelY}
                  fontSize="12"
                  fill="#FFF"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {`${(path.percentage * 100).toFixed(0)}%`}
                </SvgText>
              );
            })}
        </G>
      </Svg>

      {showLegend && (
        <View style={styles.legend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendValue}>
                {((item.value / total) * 100).toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  legend: {
    marginTop: 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});

