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

  const maxValue = Math.max(...data, 0);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue;
  const chartHeight = height - PADDING * 2 - 30; // Extra space for labels
  const chartWidth = CHART_WIDTH - PADDING * 2;
  const stepX = chartWidth / (data.length - 1 || 1);

  // Calculate a "nice" maximum value for Y-axis labels
  const getNiceMaxValue = (value: number): number => {
    if (value === 0) return 10; // Default to 10 when all values are 0
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

  // Calculate nice values for min and max
  const niceMaxValue = range === 0 && maxValue === 0 
    ? 10 
    : getNiceMaxValue(maxValue || 10);
  const niceMinValue = minValue < 0 ? -getNiceMaxValue(Math.abs(minValue)) : 0;
  // Calculate range properly
  const niceRange = niceMaxValue - niceMinValue;

  const points = data.map((value, index) => {
    const x = PADDING + index * stepX;
    const y = PADDING + chartHeight - ((value - niceMinValue) / niceRange) * chartHeight;
    return { x, y, value };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const gridLines = 5;
  const gridStep = chartHeight / gridLines;

  // Format Y-axis values with abbreviations for large numbers
  const formatYAxisValue = (value: number, useDecimals: boolean = false): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else if (value < 1 && value > 0) {
      return value.toFixed(2);
    }
    return useDecimals ? value.toFixed(1) : value.toFixed(0);
  };
  
  const useDecimalLabels = niceMaxValue <= 5;

  // Calculate which X-axis labels to show (show max 8 labels to avoid clustering)
  const getVisibleXLabels = () => {
    if (!labels || labels.length === 0) return [];
    const maxLabels = 8;
    const step = Math.max(1, Math.floor(labels.length / maxLabels));
    const visibleIndices: number[] = [];
    
    // Always show first label
    visibleIndices.push(0);
    
    // Show labels at intervals
    for (let i = step; i < labels.length - 1; i += step) {
      visibleIndices.push(i);
    }
    
    // Always show last label if not already included
    if (visibleIndices[visibleIndices.length - 1] !== labels.length - 1) {
      visibleIndices.push(labels.length - 1);
    }
    
    return visibleIndices;
  };

  const visibleXLabels = getVisibleXLabels();

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={CHART_WIDTH} height={height}>
        {/* Grid lines */}
        {showGrid &&
          Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = PADDING + i * gridStep;
            // Calculate value from top (niceMaxValue) to bottom (niceMinValue)
            // Calculate percentage position (0 = top, 1 = bottom)
            const position = i / gridLines;
            // Interpolate value from niceMaxValue to niceMinValue
            const value = niceMaxValue - (position * niceRange);
            // Round to avoid floating point precision issues
            const displayValue = Math.round(value * 100) / 100;
            // Ensure value doesn't go below minimum
            const finalValue = Math.max(niceMinValue, displayValue);
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
                  {formatYAxisValue(finalValue, useDecimalLabels)}
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
            </React.Fragment>
          ))}

        {/* X-axis labels - only show visible ones */}
        {labels && visibleXLabels.map((index) => {
          const point = points[index];
          if (!point) return null;
          return (
            <SvgText
              key={`label-${index}`}
              x={point.x}
              y={height - 8}
              fontSize="10"
              fill="#64748B"
              textAnchor="middle"
              fontWeight="500"
            >
              {labels[index]}
            </SvgText>
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

