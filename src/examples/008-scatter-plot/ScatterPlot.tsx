import { useEffect, useMemo, useRef } from 'react';
import { select } from 'd3-selection';
import { useDimensions } from '../005-responsive-pseudo-scatter-plot/useDimensions';
import { usePenguinsDataset } from '../006-loading-and-summarizing-data/usePenguinsDataset';
import type { PenguinRow } from '../006-loading-and-summarizing-data/usePenguinsDataset';
import type { Margin } from './margin';
import { useScales } from './useScales';
import { renderCircles } from './renderCircles';
import { renderAxes } from './renderAxes';
import { renderLabels } from './renderLabels';

// Accessors extract the x and y values from each row of the dataset.
const xValue = (row: PenguinRow) => row.bill_length_mm;
const yValue = (row: PenguinRow) => row.bill_depth_mm;

// Chart configuration. All tweakable values live here in one place so they
// can be adjusted without hunting through the rendering functions.
const margin: Margin = { top: 60, right: 20, bottom: 60, left: 80 };
const title = 'Palmer Penguins';
const titleFontSize = 20;
const xAxisLabel = 'Bill Length (mm)';
const yAxisLabel = 'Bill Depth (mm)';
const axisLabelFontSize = 14;
const xAxisLabelOffset = 40;
const yAxisLabelOffset = 40;

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

  const scales = useScales({ data: rows, ...dimensions, margin, xValue, yValue });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || dimensions.width === 0 || dimensions.height === 0 || !rows || !scales) return;

    // Render the marks first, then layer the axes and labels on top.
    renderCircles(select(svg), {
      data: rows,
      xScale: scales.xScale,
      yScale: scales.yScale,
      xValue,
      yValue,
    });

    renderAxes(select(svg), {
      height: dimensions.height,
      margin,
      xScale: scales.xScale,
      yScale: scales.yScale,
    });

    renderLabels(select(svg), {
      width: dimensions.width,
      height: dimensions.height,
      margin,
      title,
      titleFontSize,
      xAxisLabel,
      yAxisLabel,
      axisLabelFontSize,
      xAxisLabelOffset,
      yAxisLabelOffset,
    });
  }, [dimensions, rows, scales]);

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
