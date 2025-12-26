import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  showGrid?: boolean;
  showValues?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const DEFAULT_HEIGHT = 200;
const PADDING = 20;

export default function BarChart({
  data,
  height = DEFAULT_HEIGHT,
  showGrid = true,
  showValues = true,
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartHeight = height - PADDING * 2 - 30; // Extra space for labels
  const chartWidth = CHART_WIDTH - PADDING * 2;
  const barWidth = (chartWidth / data.length) * 0.7;
  const barSpacing = (chartWidth / data.length) * 0.3;

  const gridLines = 5;
  const gridStep = chartHeight / gridLines;

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={CHART_WIDTH} height={height}>
        {/* Grid lines */}
        {showGrid &&
          Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = PADDING + i * gridStep;
            const value = maxValue - (i / gridLines) * maxValue;
            return (
              <React.Fragment key={i}>
                <Line
                  x1={PADDING}
                  y1={y}
                  x2={PADDING + chartWidth}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={PADDING - 10}
                  y={y + 4}
                  fontSize="10"
                  fill="#64748B"
                  textAnchor="end"
                >
                  {value.toFixed(0)}
                </SvgText>
              </React.Fragment>
            );
          })}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * chartHeight;
          const x = PADDING + index * (barWidth + barSpacing) + barSpacing / 2;
          const y = PADDING + chartHeight - barHeight;
          const color = item.color || '#0066CC';

          return (
            <React.Fragment key={index}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
              />
              {showValues && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 5}
                  fontSize="10"
                  fill="#334155"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {item.value.toFixed(0)}
                </SvgText>
              )}
              <SvgText
                x={x + barWidth / 2}
                y={height - 10}
                fontSize="10"
                fill="#64748B"
                textAnchor="middle"
              >
                {item.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
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
});

