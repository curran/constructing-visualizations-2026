import type { Selection } from 'd3-selection';
import type { ScaleLinear } from 'd3-scale';
import type { PenguinRow } from '../006-loading-and-summarizing-data/usePenguinsDataset';
import type { Margin } from './margin';
import { renderCircles } from './renderCircles';
import { renderAxes } from './renderAxes';
import { renderLabels } from './renderLabels';

export interface RenderVizOptions {
  data: PenguinRow[];
  width: number;
  height: number;
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  xValue: (row: PenguinRow) => number;
  yValue: (row: PenguinRow) => number;
  margin: Margin;
  title: string;
  titleFontSize: number;
  xAxisLabel: string;
  yAxisLabel: string;
  axisLabelFontSize: number;
  xAxisLabelOffset: number;
  yAxisLabelOffset: number;
}

// The single entry point for all D3 rendering. It layers the marks,
// axes, and labels onto the SVG, keeping the D3 logic entirely separate
// from the React logic in ScatterPlot.tsx.
export function renderViz(
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  options: RenderVizOptions,
) {
  const {
    data,
    width,
    height,
    xScale,
    yScale,
    xValue,
    yValue,
    margin,
    title,
    titleFontSize,
    xAxisLabel,
    yAxisLabel,
    axisLabelFontSize,
    xAxisLabelOffset,
    yAxisLabelOffset,
  } = options;

  // Render the marks first, then layer the axes and labels on top.
  renderCircles(selection, {
    data,
    xScale,
    yScale,
    xValue,
    yValue,
  });

  renderAxes(selection, {
    height,
    margin,
    xScale,
    yScale,
  });

  renderLabels(selection, {
    width,
    height,
    margin,
    title,
    titleFontSize,
    xAxisLabel,
    yAxisLabel,
    axisLabelFontSize,
    xAxisLabelOffset,
    yAxisLabelOffset,
  });
}
