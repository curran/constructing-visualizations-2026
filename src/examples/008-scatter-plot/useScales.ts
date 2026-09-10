import { useMemo } from 'react';
import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import type { ScaleLinear } from 'd3-scale';
import type { PenguinRow } from '../006-loading-and-summarizing-data/usePenguinsDataset';
import type { Margin } from './margin';

export interface Accessor {
  (row: PenguinRow): number;
}

export interface UseScalesOptions {
  data: PenguinRow[] | null;
  width: number;
  height: number;
  margin: Margin;
  xValue: Accessor;
  yValue: Accessor;
}

export interface Scales {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
}

export function useScales({
  data,
  width,
  height,
  margin,
  xValue,
  yValue,
}: UseScalesOptions): Scales | null {
  return useMemo(() => {
    // No data yet, so no scales can be constructed.
    if (!data) return null;

    // The domain maps data space, and the range maps to screen space.
    // The range is inset by the margin so the plot area leaves room
    // for the axes and labels around it.
    const xScale = scaleLinear()
      // `extent` returns the min and max of the data for the domain.
      .domain(extent(data, xValue) as [number, number])
      .range([margin.left, width - margin.right]);

    // Flip the y range so that larger values appear higher on the screen.
    const yScale = scaleLinear()
      .domain(extent(data, yValue) as [number, number])
      .range([height - margin.bottom, margin.top]);

    return { xScale, yScale };
  }, [data, width, height, margin, xValue, yValue]);
}
