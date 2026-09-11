export async function fetchAll(makeQuery, { pageSize = 1000, maxRows = 10000 } = {}) {
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize - 1, maxRows - 1);
    const { data, error } = await makeQuery().range(from, to);
    if (error) return { data: null, error };
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return { data: rows, error: null };
}
