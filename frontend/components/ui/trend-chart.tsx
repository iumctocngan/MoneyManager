import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Point = { x: number; y: number };

function buildPoints(values: number[], width: number, height: number, padding: number) {
  const safeValues = values.length > 1 ? values : [0, 0];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return safeValues.map((value, index) => ({
    x: padding + (usableWidth * index) / Math.max(safeValues.length - 1, 1),
    y: padding + usableHeight - ((value - min) / range) * usableHeight,
  }));
}

function Segment({
  from,
  to,
  color,
}: {
  from: Point;
  to: Point;
  color: string;
}) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = `${Math.atan2(to.y - from.y, to.x - from.x)}rad`;
  const centerX = (from.x + to.x) / 2;
  const centerY = (from.y + to.y) / 2;

  return (
    <View
      style={[
        styles.segment,
        {
          left: centerX - length / 2,
          top: centerY - 1.5,
          width: length,
          backgroundColor: color,
          transform: [{ rotate: angle }],
        },
      ]}
    />
  );
}

export function TrendChart({
  positiveValues,
  negativeValues,
  positiveColor = '#35D579',
  negativeColor = '#FF7A82',
  height = 150,
}: {
  positiveValues: number[];
  negativeValues?: number[];
  positiveColor?: string;
  negativeColor?: string;
  height?: number;
}) {
  const [width, setWidth] = useState(0);

  const positivePoints = useMemo(
    () => buildPoints(positiveValues, width, height, 18),
    [height, positiveValues, width]
  );
  const negativePoints = useMemo(
    () =>
      negativeValues && negativeValues.length > 1
        ? buildPoints(negativeValues, width, height, 18)
        : [],
    [height, negativeValues, width]
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.chart, { height }]} onLayout={handleLayout}>
      <View style={styles.grid}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.gridLine} />
        ))}
      </View>

      {width > 0 ? (
        <>
          <LinearGradient
            colors={['rgba(53, 213, 121, 0.22)', 'rgba(53, 213, 121, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.overlay}
          />

          {positivePoints.slice(0, -1).map((point, index) => (
            <Segment
              key={`positive-${index}`}
              from={point}
              to={positivePoints[index + 1]}
              color={positiveColor}
            />
          ))}
          {positivePoints.map((point, index) => (
            <View
              key={`positive-dot-${index}`}
              style={[
                styles.dot,
                {
                  left: point.x - 5,
                  top: point.y - 5,
                  backgroundColor: positiveColor,
                },
              ]}
            />
          ))}

          {negativePoints.length > 1
            ? negativePoints.slice(0, -1).map((point, index) => (
                <Segment
                  key={`negative-${index}`}
                  from={point}
                  to={negativePoints[index + 1]}
                  color={negativeColor}
                />
              ))
            : null}
          {negativePoints.length > 1
            ? negativePoints.map((point, index) => (
                <View
                  key={`negative-dot-${index}`}
                  style={[
                    styles.dot,
                    {
                      left: point.x - 5,
                      top: point.y - 5,
                      backgroundColor: negativeColor,
                    },
                  ]}
                />
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    paddingVertical: 16,
  },
  gridLine: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(140, 160, 146, 0.14)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  segment: {
    position: 'absolute',
    height: 3,
    borderRadius: 999,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
