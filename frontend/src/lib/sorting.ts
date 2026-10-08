export type SortOption = "alphabetical" | "newest" | "oldest";

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "alphabetical", label: "Alphabetical (A–Z)" },
  { value: "newest", label: "Newest to Oldest" },
  { value: "oldest", label: "Oldest to Newest" },
];

/**
 * Locale-aware natural comparison.
 * Correctly sorts numbers within strings: "Batch 1", "Batch 2", "Batch 10".
 */
export function naturalCompare(a: string = "", b: string = ""): number {
  return a.trim().localeCompare(b.trim(), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Standard weight helper for natural academic/standard ordering.
 * Handles "Standard 8", "10th", "Class 9", or Roman numerals "VIII", "IX", "X".
 */
export function standardRank(name: string = ""): number {
  const clean = name.trim();
  const numMatch = clean.match(/\d+/);
  if (numMatch) {
    return parseInt(numMatch[0], 10);
  }

  const roman: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
    xi: 11,
    xii: 12,
  };

  const lower = clean.toLowerCase();
  if (roman[lower]) {
    return roman[lower];
  }

  return 999;
}

export function compareStandards(aName: string = "", bName: string = ""): number {
  const rankA = standardRank(aName);
  const rankB = standardRank(bName);
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return naturalCompare(aName, bName);
}

/**
 * Sorts any record collection by the chosen SortOption.
 */
export function sortRecords<T>(
  items: T[],
  sortOption: SortOption,
  getName: (item: T) => string,
  getDate?: (item: T) => string | number | Date | null | undefined
): T[] {
  const list = [...items];

  if (sortOption === "alphabetical") {
    return list.sort((a, b) => naturalCompare(getName(a), getName(b)));
  }

  if (sortOption === "newest") {
    return list.sort((a, b) => {
      const timeA = getDate ? new Date(getDate(a) || 0).getTime() : 0;
      const timeB = getDate ? new Date(getDate(b) || 0).getTime() : 0;
      return timeB - timeA;
    });
  }

  if (sortOption === "oldest") {
    return list.sort((a, b) => {
      const timeA = getDate ? new Date(getDate(a) || 0).getTime() : 0;
      const timeB = getDate ? new Date(getDate(b) || 0).getTime() : 0;
      return timeA - timeB;
    });
  }

  return list;
}
