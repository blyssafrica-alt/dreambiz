import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

interface GroupedBarData {
  label: string;
  series: Array<{
    label: string;
    value: number;
    color: string;
  }>;
}

interface GroupedBarChartProps {
  data: GroupedBarData[];
  height?: number;
  showGrid?: boolean;
  showValues?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const DEFAULT_HEIGHT = 200;
const PADDING = 20;

export default function GroupedBarChart({
  data,
  height = DEFAULT_HEIGHT,
  showGrid = true,
  showValues = true,
}: GroupedBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  // Find the maximum value across all series
  const rawMaxValue = Math.max(
    ...data.flatMap(d => d.series.map(s => s.value)),
    0
  );

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

  const niceMaxValue = getNiceMaxValue(rawMaxValue || 10);
  const chartHeight = height - PADDING * 2 - 30;
  const chartWidth = CHART_WIDTH - PADDING * 2;
  
  // Calculate bar dimensions
  const groupWidth = chartWidth / data.length;
  const barSpacing = 4;
  const maxSeriesCount = Math.max(...data.map(d => d.series.length), 1);
  const barWidth = (groupWidth - barSpacing * (maxSeriesCount - 1)) / maxSeriesCount;

  const gridLines = 5;
  const gridStep = chartHeight / gridLines;

  // Format Y-axis values
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

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={CHART_WIDTH} height={height}>
        {/* Grid lines */}
        {showGrid &&
          Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = PADDING + i * gridStep;
            // Calculate value from top to bottom using proper step
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

        {/* Grouped Bars */}
        {data.map((group, groupIndex) => {
          const groupX = PADDING + groupIndex * groupWidth;
          
          return (
            <React.Fragment key={groupIndex}>
              {group.series.map((series, seriesIndex) => {
                const barHeight = (series.value / niceMaxValue) * chartHeight;
                const x = groupX + seriesIndex * (barWidth + barSpacing);
                const y = PADDING + chartHeight - barHeight;

                return (
                  <React.Fragment key={seriesIndex}>
                    <Rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={series.color}
                      rx={4}
                    />
                    {showValues && series.value > 0 && (
                      <SvgText
                        x={x + barWidth / 2}
                        y={y - 5}
                        fontSize="9"
                        fill="#334155"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {formatYAxisValue(series.value)}
                      </SvgText>
                    )}
                  </React.Fragment>
                );
              })}
              
              {/* X-axis label */}
              <SvgText
                x={groupX + groupWidth / 2}
                y={height - 10}
                fontSize="10"
                fill="#64748B"
                textAnchor="middle"
                fontWeight="500"
              >
                {group.label.length > 8 ? group.label.substring(0, 7) + '...' : group.label}
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

