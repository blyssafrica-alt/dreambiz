import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

interface LineChartProps {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showPoints?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const DEFAULT_HEIGHT = 200;
const PADDING = 20;

export default function LineChart({
  data,
  labels,
  color = '#0066CC',
  height = DEFAULT_HEIGHT,
  showGrid = true,
  showPoints = true,
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;
  const chartHeight = height - PADDING * 2;
  const chartWidth = CHART_WIDTH - PADDING * 2;
  const stepX = chartWidth / (data.length - 1 || 1);

  const points = data.map((value, index) => {
    const x = PADDING + index * stepX;
    const y = PADDING + chartHeight - ((value - minValue) / range) * chartHeight;
    return { x, y, value };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const gridLines = 5;
  const gridStep = chartHeight / gridLines;

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={CHART_WIDTH} height={height}>
        {/* Grid lines */}
        {showGrid &&
          Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = PADDING + i * gridStep;
            const value = maxValue - (i / gridLines) * range;
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

        {/* Chart line */}
        <Polyline
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />

        {/* Data points */}
        {showPoints &&
          points.map((point, index) => (
            <React.Fragment key={index}>
              <Circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                stroke="#FFF"
                strokeWidth="2"
              />
              {labels && labels[index] && (
                <SvgText
                  x={point.x}
                  y={height - 5}
                  fontSize="10"
                  fill="#64748B"
                  textAnchor="middle"
                >
                  {labels[index]}
                </SvgText>
              )}
            </React.Fragment>
          ))}
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

