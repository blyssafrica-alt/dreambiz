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

  const rawMaxValue = Math.max(...data.map(d => d.value), 0);
  // Ensure maxValue is at least 1 to avoid division by zero, but use raw max for display
  const maxValue = Math.max(rawMaxValue, 1);
  const chartHeight = height - PADDING * 2 - 30; // Extra space for labels
  const chartWidth = CHART_WIDTH - PADDING * 2;
  const barWidth = (chartWidth / data.length) * 0.7;
  const barSpacing = (chartWidth / data.length) * 0.3;

  const gridLines = 5;
  const gridStep = chartHeight / gridLines;

  // Calculate a "nice" maximum value for Y-axis labels to avoid rounding issues
  const getNiceMaxValue = (value: number): number => {
    if (value === 0) return 10; // Default to 10 when all values are 0
    // For very small values (0-2), use at least 2 to ensure proper label spacing
    if (value <= 2) return 2;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    let niceValue;
    if (normalized <= 1) niceValue = 1;
    else if (normalized <= 2) niceValue = 2;
    else if (normalized <= 5) niceValue = 5;
    else niceValue = 10;
    return niceValue * magnitude;
  };

  const niceMaxValue = getNiceMaxValue(rawMaxValue || 10);

  // Format Y-axis values with abbreviations for large numbers
  const formatYAxisValue = (value: number, useDecimals: boolean = false): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else if (value < 1 && value > 0) {
      return value.toFixed(2);
    }
    // Use 1 decimal place for small max values to avoid duplicate labels
    return useDecimals ? value.toFixed(1) : value.toFixed(0);
  };
  
  // Use decimal formatting when nice max value is small to avoid duplicate labels
  const useDecimalLabels = niceMaxValue <= 5;

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={CHART_WIDTH} height={height}>
        {/* Grid lines */}
        {showGrid &&
          Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = PADDING + i * gridStep;
            // Calculate value from top to bottom using nice max value for labels
            // Ensure proper step calculation
            const stepValue = niceMaxValue / gridLines;
            const value = niceMaxValue - (i * stepValue);
            // Ensure value is never negative
            const displayValue = Math.max(0, value);
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
                  x={PADDING - 12}
                  y={y + 5}
                  fontSize="11"
                  fill="#64748B"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {formatYAxisValue(displayValue, useDecimalLabels)}
                </SvgText>
              </React.Fragment>
            );
          })}

        {/* Bars */}
        {data.map((item, index) => {
          // Use niceMaxValue for bar height calculation to match Y-axis labels
          const barHeight = (item.value / niceMaxValue) * chartHeight;
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
              {showValues && item.value > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 5}
                  fontSize="10"
                  fill="#334155"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {formatYAxisValue(item.value)}
                </SvgText>
              )}
              <SvgText
                x={x + barWidth / 2}
                y={height - 10}
                fontSize="10"
                fill="#64748B"
                textAnchor="middle"
                fontWeight="500"
              >
                {item.label.length > 8 ? item.label.substring(0, 7) + '...' : item.label}
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

