import type { Selection } from 'd3-selection';
import type { Margins } from './margins';

// The axis labels sit just outside the axes.
const AXIS_LABEL_OFFSET = 40;

export interface RenderLabelsOptions {
  width: number;
  height: number;
  margins: Margins;
}

export function renderLabels(
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  options: RenderLabelsOptions,
) {
  const { width, height, margins } = options;

  // The centers of the plot area define where axis labels are centered.
  const plotCenterX = margins.left + (width - margins.left - margins.right) / 2;
  const plotCenterY = margins.top + (height - margins.top - margins.bottom) / 2;

  // The title sits centered at the top of the chart.
  selection
    .selectAll('text.title')
    .data([null])
    .join('text')
    .attr('class', 'title')
    .attr('x', width / 2)
    .attr('y', margins.top / 2)
    .attr('text-anchor', 'middle')
    .attr('font-size', '20px')
    .text('Palmer Penguins');

  // The x axis label is centered horizontally on the x axis, below it.
  selection
    .selectAll('text.x-axis-label')
    .data([null])
    .join('text')
    .attr('class', 'x-axis-label')
    .attr('x', plotCenterX)
    .attr('y', height - margins.bottom + AXIS_LABEL_OFFSET)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .text('Bill Length (mm)');

  // The y axis label is rotated -90 degrees so it runs bottom to top,
  // centered vertically on the y axis, to its left.
  selection
    .selectAll('text.y-axis-label')
    .data([null])
    .join('text')
    .attr('class', 'y-axis-label')
    .attr('transform', `translate(${margins.left - AXIS_LABEL_OFFSET}, ${plotCenterY}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .text('Bill Depth (mm)');
}