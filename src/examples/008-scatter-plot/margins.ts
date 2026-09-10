// Margins reserve space around the plot for the title, axes, and axis labels.
export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// The top margin leaves room for the title, the left and bottom margins
// leave room for the y and x axes and their labels, and the right margin
// is a small breathing space.
export const margins: Margins = {
  top: 60,
  right: 20,
  bottom: 60,
  left: 80,
};
