import type { Selection } from 'd3-selection';
import type { Margin } from './margin';

export interface RenderLabelsOptions {
  width: number;
  height: number;
  margin: Margin;
  title: string;
  titleFontSize: number;
  xAxisLabel: string;
  yAxisLabel: string;
  axisLabelFontSize: number;
  xAxisLabelOffset: number;
  yAxisLabelOffset: number;
}

export function renderLabels(
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  options: RenderLabelsOptions,
) {
  const {
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
  } = options;

  // The centers of the plot area define where axis labels are centered.
  const plotCenterX = margin.left + (width - margin.left - margin.right) / 2;
  const plotCenterY = margin.top + (height - margin.top - margin.bottom) / 2;

  // The title sits centered at the top of the chart.
  selection
    .selectAll('text.title')
    .data([null])
    .join('text')
    .attr('class', 'title')
    .attr('x', width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .attr('font-size', titleFontSize)
    .text(title);

  // The x axis label is centered horizontally on the x axis, below it.
  selection
    .selectAll('text.x-axis-label')
    .data([null])
    .join('text')
    .attr('class', 'x-axis-label')
    .attr('x', plotCenterX)
    .attr('y', height - margin.bottom + xAxisLabelOffset)
    .attr('text-anchor', 'middle')
    .attr('font-size', axisLabelFontSize)
    .text(xAxisLabel);

  // The y axis label is rotated -90 degrees so it runs bottom to top,
  // centered vertically on the y axis, to its left.
  selection
    .selectAll('text.y-axis-label')
    .data([null])
    .join('text')
    .attr('class', 'y-axis-label')
    .attr('transform', `translate(${margin.left - yAxisLabelOffset}, ${plotCenterY}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('font-size', axisLabelFontSize)
    .text(yAxisLabel);
}
