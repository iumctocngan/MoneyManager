import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';


/** Một phần (slice) của biểu đồ donut — percentage từ 0 đến 1. */
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

/**
 * Biểu đồ donut vẽ bằng SVG thuần — không dùng thư viện chart để giữ bundle nhỏ.
 * Mỗi slice là một Circle với `strokeDasharray` + `strokeDashoffset` để tạo cung tròn,
 * sau đó xoay theo `currentAngle` để xếp liền kề nhau.
 */
export function DonutChart({
  data,
  size = 120,
  strokeWidth = 24,
  emptyColor = 'rgba(174, 213, 188, 0.2)', // Matches SoftColors aesthetics
}: DonutChartProps) {
  // radius tính theo cạnh trong của stroke để vòng tròn không bị cắt ở mép SVG
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Bắt đầu từ -90° (đỉnh) thay vì 0° (bên phải) để slice đầu tiên bắt đầu từ trên cùng
  let currentAngle = -90; // Start at top

  // Check if there is actual data
  const hasData = data.reduce((sum, item) => sum + item.percentage, 0) > 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* G dùng originX/Y để các phép transform rotate lấy tâm là tâm SVG */}
        <G originX={center} originY={center}>
          {hasData ? (
            data.map((slice, index) => {
              // strokeDashoffset điều chỉnh độ dài cung: offset lớn = cung ngắn
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
                  // butt cap để các slice tiếp xúc nhau mà không có khoảng trống tròn ở đầu
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
