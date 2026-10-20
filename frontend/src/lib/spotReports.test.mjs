import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./spotReports.ts', import.meta.url), 'utf8')
  .replace('import.meta.env.VITE_API_URL', 'undefined');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { fetchAlerts } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('live mapping preserves report IDs and only resolves supplied memory snapshots', async () => {
  const base = { _id: 'region', geohash: 'region', lat: 1, lon: 2,
    updated_at: '2026-05-03T00:00:00Z', contributing_report_ids: ['report-1'] };
  const memory = { id: 'used', timestamp: '2026-05-02T00:00:00Z', text: 'Applied guidance' };
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => [
      { ...base, cited_memory_ids: ['used', 'unknown'], cited_memories: [memory, { ...memory, id: 'unused' }] },
      { ...base, _id: 'legacy' },
      { ...base, _id: 'unreferenced', cited_memory_ids: [], cited_memories: [memory] },
    ] });
    const alerts = await fetchAlerts();
    assert.deepEqual(alerts[0].contributingSpotIds, ['report-1']);
    assert.deepEqual(alerts[0].citedMemoryIds, ['used']);
    assert.deepEqual(alerts[0].citedMemories, [memory]);
    for (const alert of alerts.slice(1)) {
      assert.deepEqual(alert.citedMemoryIds, []);
      assert.deepEqual(alert.citedMemories, []);
    }
  } finally { globalThis.fetch = original; }
});
