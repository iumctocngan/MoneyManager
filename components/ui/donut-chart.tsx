import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';


export type DonutSlice = {
  percentage: number; // 0 to 1
  color: string;
};

type DonutChartProps = {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  emptyColor?: string;
};

export function DonutChart({
  data,
  size = 120,
  strokeWidth = 24,
  emptyColor = 'rgba(174, 213, 188, 0.2)', // Matches SoftColors aesthetics
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentAngle = -90; // Start at top

  // Check if there is actual data
  const hasData = data.reduce((sum, item) => sum + item.percentage, 0) > 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G originX={center} originY={center}>
          {hasData ? (
            data.map((slice, index) => {
              const dashOffset = circumference - slice.percentage * circumference;
              const sliceRotation = currentAngle;

              // Calculate start angle for next slice
              currentAngle += slice.percentage * 360;

              // Do not render empty slices
              if (slice.percentage <= 0) return null;

              return (
                <Circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  transform={`rotate(${sliceRotation} ${center} ${center})`}
                  fill="transparent"
                />
              );
            })
          ) : (
            // Render empty state
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={emptyColor}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          )}
        </G>
      </Svg>
    </View>
  );
}
