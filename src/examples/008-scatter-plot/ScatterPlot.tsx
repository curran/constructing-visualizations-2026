import { useEffect, useMemo, useRef } from 'react';
import { select } from 'd3-selection';
import { useDimensions } from '../005-responsive-pseudo-scatter-plot/useDimensions';
import { usePenguinsDataset } from '../006-loading-and-summarizing-data/usePenguinsDataset';
import type { PenguinRow } from '../006-loading-and-summarizing-data/usePenguinsDataset';
import { margins } from './margins';
import { useScales } from './useScales';
import { renderCircles } from './renderCircles';
import { renderAxes } from './renderAxes';
import { renderLabels } from './renderLabels';

// Accessors extract the x and y values from each row of the dataset.
const xValue = (row: PenguinRow) => row.bill_length_mm;
const yValue = (row: PenguinRow) => row.bill_depth_mm;

export function ScatterPlot() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: divRef, dimensions } = useDimensions();
  const data = usePenguinsDataset();

  // Some rows in the dataset have missing measurements (NA), which would
  // map to undefined circle positions and render as stray dots at the
  // origin. Drop those rows so every remaining row maps to a valid circle.
  const rows = useMemo(
    () =>
      data?.filter(
        (row) => Number.isFinite(row.bill_length_mm) && Number.isFinite(row.bill_depth_mm),
      ) ?? null,
    [data],
  );

  const scales = useScales({ data: rows, ...dimensions, margins, xValue, yValue });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || dimensions.height === 0 || !rows || !scales) return;

    renderCircles(select(svg), {
      data: rows,
      xScale: scales.xScale,
      yScale: scales.yScale,
      xValue,
      yValue,
    });
  }, [dimensions, rows, scales]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || dimensions.height === 0 || !scales) return;

    renderAxes(select(svg), {
      height: dimensions.height,
      margins,
      xScale: scales.xScale,
      yScale: scales.yScale,
    });
  }, [dimensions, scales]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || dimensions.height === 0) return;

    renderLabels(select(svg), { width: dimensions.width, height: dimensions.height, margins });
  }, [dimensions]);

  return (
    <div ref={divRef} className="relative w-full h-full">
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        role="img"
        aria-label="Scatter plot of Palmer Penguins bill length and bill depth"
      ></svg>
    </div>
  );
}
