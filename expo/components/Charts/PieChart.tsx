import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';

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
  const radius = Math.max((size - 40) / 2, 50); // Ensure minimum radius
  let currentAngle = -90; // Start from top

  const paths = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    // Handle full circle (100%) case
    if (Math.abs(angle - 360) < 0.01) {
      // Full circle - use a simpler path that definitely works
      const pathData = `M ${center} ${center} m -${radius} 0 a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`;
      
      return {
        path: pathData,
        color: item.color,
        label: item.label,
        percentage,
        labelX: center,
        labelY: center,
        isFullCircle: true,
      };
    }

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
      isFullCircle: false,
    };
  });

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G>
            {paths.map((path, index) => {
              // For full circle, use Circle element for better rendering
              if ((path as any).isFullCircle) {
                return (
                  <React.Fragment key={index}>
                    <Circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill={path.color || '#0066CC'}
                      stroke="#FFF"
                      strokeWidth="2"
                    />
                  </React.Fragment>
                );
              }
              return (
                <Path
                  key={index}
                  d={path.path}
                  fill={path.color || '#0066CC'}
                  stroke="#FFF"
                  strokeWidth="2"
                />
              );
            })}
            {showLabels &&
              paths.map((path, index) => {
                if (path.percentage < 0.05) return null; // Don't show labels for very small slices
                // For full circle (100%), center the label
                const isFullCircle = (path as any).isFullCircle || false;
                return (
                  <SvgText
                    key={index}
                    x={isFullCircle ? center : path.labelX}
                    y={isFullCircle ? center + 5 : path.labelY}
                    fontSize="14"
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
      </View>

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
    minHeight: 200,
    paddingVertical: 20,
    width: '100%',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  legend: {
    marginTop: 16,
    width: '100%',
    paddingHorizontal: 20,
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

