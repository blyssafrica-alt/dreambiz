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
const PADDING_LEFT = 45; // Increased for Y-axis labels
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 30;

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
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const chartWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  
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
      <Svg width={CHART_WIDTH} height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
        {/* Grid lines */}
        {showGrid &&
          Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = PADDING_TOP + i * gridStep;
            // Calculate value from top to bottom
            // Calculate percentage position (0 = top, 1 = bottom)
            const position = i / gridLines;
            // Interpolate value from niceMaxValue to 0
            const value = niceMaxValue * (1 - position);
            // Round to avoid floating point precision issues
            const displayValue = Math.round(value * 100) / 100;
            // Ensure value is never negative
            const finalValue = Math.max(0, displayValue);
            return (
              <React.Fragment key={i}>
                <Line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={PADDING_LEFT + chartWidth}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={PADDING_LEFT - 8}
                  y={y + 4}
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

        {/* Grouped Bars */}
        {data.map((group, groupIndex) => {
          const groupX = PADDING_LEFT + groupIndex * groupWidth;
          
          return (
            <React.Fragment key={groupIndex}>
              {group.series.map((series, seriesIndex) => {
                const barHeight = (series.value / niceMaxValue) * chartHeight;
                const x = groupX + seriesIndex * (barWidth + barSpacing);
                const y = PADDING_TOP + chartHeight - barHeight;

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

