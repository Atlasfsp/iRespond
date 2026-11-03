"""Exercise runner policy updates against a stateful GitHub API model."""
import contextlib
import io
import json
import pathlib
import runpy
import unittest
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).with_name('configure-runner-group.py')

class GitHubGroup:
    def __init__(self, selected=None, exists=True, ignore_assignment=False):
        self.selected = [42] if selected is None else selected
        self.exists = exists
        self.ignore_assignment = ignore_assignment
        self.writes = []
    def __call__(self, args, text=True):
        path = args[2]
        method = args[args.index('--method') + 1] if '--method' in args else 'GET'
        payload = json.loads(pathlib.Path(args[args.index('--input') + 1]).read_text()) if '--input' in args else {}
        if method != 'GET': self.writes.append((method, path, payload))
        if path == 'repos/Atlasfsp/iRespond': return json.dumps({'id': 42})
        if path.endswith('runner-groups') and method == 'GET':
            return json.dumps({'runner_groups': [{'id': 4, 'name': 'irespond-mac-isolated-20261102'}] if self.exists else []})
        if path.endswith('/repositories'):
            if method == 'PUT':
                if not self.ignore_assignment: self.selected = payload['selected_repository_ids']
                return ''
            return json.dumps({'repositories': [{'id': value} for value in self.selected]})
        if method in ('PATCH', 'POST'):
            # Updating visibility can clear the selection; require the dedicated API.
            self.selected = [] if method == 'PATCH' else payload.get('selected_repository_ids', [])
            self.exists = True
            return json.dumps({'id': 4, **payload})
        raise AssertionError((path, method))

class RunnerGroupTests(unittest.TestCase):
    def run_setup(self, model):
        with patch('subprocess.check_output', model), contextlib.redirect_stdout(io.StringIO()):
            runpy.run_path(str(SCRIPT), run_name='__main__')
    def test_update_restores_exact_repository_selection(self):
        model = GitHubGroup()
        self.run_setup(model)
        self.assertEqual(model.selected, [42])
        self.assertTrue(any(method == 'PUT' and path.endswith('/4/repositories') for method, path, _ in model.writes))
    def test_empty_selection_is_repaired(self):
        model = GitHubGroup(selected=[])
        self.run_setup(model)
        self.assertEqual(model.selected, [42])
    def test_create_retains_only_the_target_repository(self):
        model = GitHubGroup(exists=False)
        self.run_setup(model)
        self.assertEqual(model.selected, [42])
    def test_unrelated_repository_is_never_taken_over(self):
        model = GitHubGroup(selected=[99])
        with self.assertRaises(AssertionError): self.run_setup(model)
        self.assertEqual(model.writes, [])
    def test_ignored_assignment_cannot_report_success(self):
        model = GitHubGroup(ignore_assignment=True)
        with self.assertRaises(AssertionError): self.run_setup(model)

if __name__ == '__main__': unittest.main()
