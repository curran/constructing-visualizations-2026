import { axisBottom, axisLeft } from 'd3-axis';
import type { Selection } from 'd3-selection';
import type { ScaleLinear } from 'd3-scale';
import type { Margin } from './margin';

export interface RenderAxesOptions {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  height: number;
  margin: Margin;
}

export function renderAxes(
  selection: Selection<SVGSVGElement, unknown, null, undefined>,
  options: RenderAxesOptions,
) {
  const { xScale, yScale, height, margin } = options;

  // The x axis sits at the bottom of the plot area.
  selection
    .selectAll<SVGGElement, null>('g.x-axis')
    .data([null])
    .join('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(axisBottom(xScale));

  // The y axis sits at the left of the plot area.
  selection
    .selectAll<SVGGElement, null>('g.y-axis')
    .data([null])
    .join('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(axisLeft(yScale));
}
