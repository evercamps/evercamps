export function sortRoutes<T extends { path: string }>(routes: T[]): T[] {
  return routes.sort((a, b) => {
    const aSpecificity = calculateRouteSpecificity(a.path);
    const bSpecificity = calculateRouteSpecificity(b.path);
    return bSpecificity - aSpecificity;
  });
}

function calculateRouteSpecificity(path: string): number {
  let specificity = 0;

  if (!path.includes(':')) {
    specificity += 100;
  }

  specificity += path
    .split('/')
    .filter((segment) => !segment.startsWith(':')).length;

  specificity -= path
    .split('/')
    .filter((segment) => segment.startsWith(':')).length;

  if (path.includes('(') && path.includes(')')) {
    specificity -= 5;
  }

  return specificity;
}
