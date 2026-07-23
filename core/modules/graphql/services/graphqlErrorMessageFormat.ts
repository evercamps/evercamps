export function graphqlErrorMessageFormat(
  inputString: string | undefined | null,
  lineNumber: number,
  columnNumber: number
): string {
  if (!inputString) {
    return '';
  }

  const lines = inputString.split('\n');

  if (lineNumber <= 0 || lineNumber > lines.length) {
    return 'Invalid line number';
  }

  const zeroBasedLineNumber = lineNumber - 1;
  const line = lines[zeroBasedLineNumber];

  if (columnNumber <= 0 || columnNumber > line.length) {
    return 'Invalid column number for the given line';
  }

  const zeroBasedColumnNumber = columnNumber - 1;
  const startIndex = zeroBasedColumnNumber;

  let endIndex = line.indexOf(')', startIndex);

  if (endIndex === -1) {
    endIndex = line.length;
  }

  const ANSI_RESET = '\x1b[0m';
  const ANSI_HIGHLIGHT = '\x1b[33m';

  const highlightedText = line.substring(startIndex, endIndex);

  const highlightedLine = line.replace(
    highlightedText,
    `${ANSI_HIGHLIGHT}${highlightedText}${ANSI_RESET}`
  );

  return highlightedLine;
}