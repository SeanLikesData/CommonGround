"""Run with: python -m unittest discover -s agent/tests"""
import sys
import os
os.environ.setdefault("NEO4J_URI", "bolt://localhost:7687")
os.environ.setdefault("NEO4J_USER", "neo4j")
os.environ.setdefault("NEO4J_PASSWORD", "test")
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import memory
import alerts
import cycle
from agent import Assessment, AlertAssessment


class CitationsTest(unittest.TestCase):
    def test_legacy_multiline_ids_survive_append(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'memories.md'
            path.write_text('- [2026-05-03T00:00:00+00:00] Rule\ncontinuation\n')
            with patch.object(memory, 'MEMORIES_PATH', path):
                before = memory.memory_records()
                memory.append_memory('Unrelated guidance')
                self.assertEqual(before[0], memory.memory_records()[0])
                self.assertEqual(before[0]['text'], 'Rule\ncontinuation')
                self.assertNotEqual(before[0]['id'], memory.memory_records()[1]['id'])

    def test_only_explicit_known_regional_references_persist(self):
        rows = [dict(geohash=g, lat=1, lon=2, mods=['rf'], report_count=1,
                     sources=['first-contact'], report_ids=['report-1']) for g in ['a', 'b']]
        memories = [dict(id='used', text='Rule', timestamp='now'),
                    dict(id='unused', text='Other rule', timestamp='then')]
        assessment = AlertAssessment(geohash='a', reasoning='Rule applies here',
                                     cited_memory_ids=['used', 'invented', 'used'])
        with patch.object(alerts, '_alerts') as collection:
            alerts.persist_alerts(rows, None, assessments=[assessment, AlertAssessment(geohash="b", reasoning="No guidance applied")], memories=memories)
            docs = [c.args[1]['$set'] for c in collection.return_value.update_one.call_args_list]
            self.assertEqual(docs[0]['cited_memory_ids'], ['used'])
            self.assertEqual(docs[0]['cited_memories'], [memories[0]])
            self.assertEqual(docs[1]['cited_memory_ids'], [])
            self.assertEqual(docs[1]['cited_memories'], [])
            self.assertEqual(docs[0]['contributing_report_ids'], ['report-1'])
            collection.return_value.reset_mock()
            alerts.persist_alerts(rows, None)
            doc = collection.return_value.update_one.call_args.args[1]['$set']
            self.assertIsNone(doc['reasoning'])
            self.assertEqual(doc['cited_memories'], [])

    def test_cycle_uses_same_memory_snapshot_and_retries_failure(self):
        import asyncio
        data = {'first_contact': [dict(geohash='a', lat=1, lon=2, reports=1)]}
        snapshot = [dict(id='used', timestamp='now', text='Rule')]
        output = Assessment(sitrep='Summary', alerts=[AlertAssessment(
            geohash='a', reasoning='Applied rule', cited_memory_ids=['used'])])
        from unittest.mock import AsyncMock
        agent = SimpleNamespace(run=AsyncMock(side_effect=[RuntimeError('failure'), SimpleNamespace(output=output)]))
        with patch.object(cycle, '_last_heuristics', None), patch.object(cycle, 'run_heuristics', return_value=data), patch.object(cycle, 'memory_records', return_value=snapshot) as records, patch.object(cycle, 'build_agent', return_value=agent) as build, patch.object(cycle, 'persist_alerts') as persist:
            with self.assertRaises(RuntimeError):
                asyncio.run(cycle.run_once(1, 2))
            asyncio.run(cycle.run_once(1, 2))
            build.assert_called_with(snapshot)
            self.assertEqual(persist.call_args.kwargs['memories'], snapshot)
            self.assertEqual(persist.call_args.kwargs['assessments'], output.alerts)
            asyncio.run(cycle.run_once(1, 2))
            persist.assert_called_with(alerts.derive_alerts(data), reasoning=None)
            self.assertEqual(agent.run.await_count, 2)
            records.return_value = snapshot + [dict(id='new', timestamp='later', text='New guidance')]
            agent.run.side_effect = None
            agent.run.return_value = SimpleNamespace(output=output)
            asyncio.run(cycle.run_once(1, 2))
            self.assertEqual(agent.run.await_count, 3)


if __name__ == '__main__':
    unittest.main()
