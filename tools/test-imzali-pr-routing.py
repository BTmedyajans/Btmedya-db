#!/usr/bin/env python3
"""Focused routing tests for the signed automation PR helper; no GitHub network calls."""
import importlib.util
import os
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / ".github" / "actions" / "imzali-pr" / "imzali_pr.py"

os.environ.setdefault("GITHUB_REPOSITORY", "BTmedyajans/Btmedya-db")
os.environ.setdefault("GH_TOKEN", "test-token")
os.environ.setdefault("DAL", "automation/test")
os.environ.setdefault("YOLLAR", "public/index.html")
os.environ["PUBLISH_REPO"] = "busetuncay1029-ai/Btmedya-db"
os.environ["GITHUB_RUN_ID"] = "123456"
os.environ["GITHUB_SHA"] = "a" * 40

spec = importlib.util.spec_from_file_location("imzali_pr_test_module", SCRIPT)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class AutomationRoutingTests(unittest.TestCase):
    def setUp(self):
        self.original_repo = helper.REPO
        self.original_publish_repo = helper.PUBLISH_REPO
        self.original_dal = helper.DAL
        helper.REPO = "BTmedyajans/Btmedya-db"
        helper.PUBLISH_REPO = "busetuncay1029-ai/Btmedya-db"
        helper.DAL = "automation/haber-kapaklari"

    def tearDown(self):
        helper.REPO = self.original_repo
        helper.PUBLISH_REPO = self.original_publish_repo
        helper.DAL = self.original_dal

    def test_unique_cross_fork_branch_is_run_scoped(self):
        self.assertEqual(
            helper.unique_branch("automation/haber-kapaklari", "b" * 40),
            "automation/haber-kapaklari-123456",
        )

    def test_reuses_existing_fork_pr_branch(self):
        with patch.object(helper, "istek", return_value=(200, [{
            "number": 99,
            "head": {
                "ref": "automation/haber-kapaklari-123",
                "repo": {"full_name": "busetuncay1029-ai/Btmedya-db"},
            },
            "base": {"ref": "main"},
        }])):
            branch = helper.find_existing_cross_pr("automation/haber-kapaklari")
        self.assertEqual(branch, "automation/haber-kapaklari-123")

    def test_cross_fork_pr_targets_canonical_main(self):
        calls = []
        def fake_request(method, url, body=None):
            calls.append((method, url, body))
            if method == "GET":
                return 200, []
            return 201, {"number": 123, "html_url": "https://github.com/BTmedyajans/Btmedya-db/pull/123"}

        with patch.object(helper, "istek", side_effect=fake_request):
            helper.pr_ac("automation/haber-kapaklari-123")
        self.assertEqual(calls[0][1], "https://api.github.com/repos/BTmedyajans/Btmedya-db/pulls?state=open&base=main&per_page=100")
        self.assertEqual(calls[1][0], "POST")
        payload = calls[1][2]
        self.assertEqual(payload["head"], "busetuncay1029-ai:automation/haber-kapaklari-123")
        self.assertEqual(payload["head_repo"], "busetuncay1029-ai/Btmedya-db")
        self.assertEqual(payload["base"], "main")


if __name__ == "__main__":
    unittest.main(verbosity=2)
